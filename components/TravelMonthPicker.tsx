'use client';

/**
 * Expected travel date picker for Customer forms.
 *
 * Libraries (already in package.json — no new deps):
 * - `antd` — DatePicker (day calendar + clear + typed input)
 * - `dayjs` — parse/format (+ customParseFormat)
 * - `@ant-design/icons` — CalendarOutlined
 * - `@ant-design/nextjs-registry` — scoped AntdRegistry for SSR styles
 *
 * UX: type freely (MM/DD/YYYY and common variants) or open the calendar
 * icon and click a day. Stored as ISO `YYYY-MM-DD`. Legacy `YYYY-MM` values
 * still display (as day 1) until the user picks or types a full date.
 */

import { CalendarOutlined } from '@ant-design/icons';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, DatePicker } from 'antd';
import enUS from 'antd/locale/en_US';
import viVN from 'antd/locale/vi_VN';
import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useLanguage } from '@/hooks/useLanguage';
import {
  isIsoTravelValue,
  travelDateInputValue,
} from '@/lib/core/travel-month';

dayjs.extend(customParseFormat);

/** First format is the display format; the rest are accepted when typing. */
const DISPLAY_FORMATS = [
  'MM/DD/YYYY',
  'M/D/YYYY',
  'MMM D, YYYY',
  'YYYY-MM-DD',
  'MM/YYYY',
  'MMM YYYY',
  'YYYY-MM',
] as const;

type TravelMonthPickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function toStoredDate(next: Dayjs | null): string {
  return next ? next.format('YYYY-MM-DD') : '';
}

export default function TravelMonthPicker({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
}: TravelMonthPickerProps) {
  const { language } = useLanguage();
  const iso = travelDateInputValue(value);
  const picked: Dayjs | null = iso ? dayjs(iso) : null;
  const earliest = dayjs().startOf('day').subtract(1, 'month');
  const latest = dayjs().startOf('day').add(5, 'year');

  return (
    <AntdRegistry>
      <ConfigProvider
        locale={language === 'vi' ? viVN : enUS}
        theme={{
          token: {
            colorPrimary: '#2E7D52',
            colorInfo: '#2E7D52',
            colorBorder: '#E2E8E4',
            colorText: '#1a2e23',
            colorTextPlaceholder: '#6B7F74',
            colorBgContainer: '#fff',
            colorBgElevated: '#fff',
            fontFamily: 'inherit',
            borderRadius: 7,
            controlHeight: 33,
          },
          components: {
            DatePicker: {
              cellHeight: 30,
              cellWidth: 34,
              cellHoverBg: '#E8F5EE',
              cellActiveWithRangeBg: '#2E7D52',
            },
          },
        }}
      >
        <DatePicker
          id={id}
          className="travel-month-picker"
          popupClassName="travel-month-picker-dropdown"
          value={picked}
          disabled={disabled}
          allowClear
          needConfirm={false}
          showNow={false}
          format={[...DISPLAY_FORMATS]}
          placeholder={placeholder ?? 'MM/DD/YYYY'}
          defaultPickerValue={dayjs().add(3, 'month')}
          disabledDate={(current) => {
            if (!current) return false;
            return current.isBefore(earliest, 'day') || current.isAfter(latest, 'day');
          }}
          suffixIcon={<CalendarOutlined className="travel-month-picker__icon" />}
          size="middle"
          style={{ width: '100%', height: 33 }}
          getPopupContainer={() => document.body}
          styles={{ popup: { root: { zIndex: 450 } } }}
          onChange={(next) => {
            onChange(toStoredDate(next));
          }}
        />
      </ConfigProvider>
      {value && !isIsoTravelValue(value) && (
        <div className="nc-form-hint">Legacy value kept: {value}</div>
      )}
    </AntdRegistry>
  );
}
