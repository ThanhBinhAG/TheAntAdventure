'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { themeCssVars } from '@/lib/theme/apply-theme';
import { CRM_FONT_SIZE_OPTIONS } from '@/lib/theme/font-size';
import { CRM_THEME_PRESETS } from '@/lib/theme/presets';

function ThemeMiniChrome() {
  return (
    <div className="theme-mini-chrome" aria-hidden>
      <div className="theme-mini-chrome__sb">
        <span className="theme-mini-chrome__sb-brand" />
        <span className="theme-mini-chrome__sb-item theme-mini-chrome__sb-item--on" />
        <span className="theme-mini-chrome__sb-item" />
        <span className="theme-mini-chrome__sb-item" />
      </div>
      <div className="theme-mini-chrome__main">
        <div className="theme-mini-chrome__topbar" />
        <div className="theme-mini-chrome__content">
          <div className="theme-mini-chrome__card">
            <span className="theme-mini-chrome__line" />
            <span className="theme-mini-chrome__line theme-mini-chrome__line--short" />
            <span className="theme-mini-chrome__btn" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThemePanel() {
  const { language } = useLanguage();
  const { themeId, setTheme, fontSizeId, setFontSize } = useTheme();
  const vi = language === 'vi';

  return (
    <div className="settings-theme">
      <section className="settings-theme__section" aria-labelledby="settings-theme-colors">
        <h2 id="settings-theme-colors" className="settings-theme__section-title">
          {vi ? 'Màu giao diện' : 'Colors'}
        </h2>
        <p className="settings-theme__hint">
          {vi
            ? 'Chọn một bộ màu để áp dụng ngay. Xem trước trên từng thẻ trước khi chọn.'
            : 'Pick a color preset to apply immediately. Preview each card before you choose.'}
        </p>
        <div
          className="settings-theme-grid"
          role="listbox"
          aria-label={vi ? 'Màu giao diện' : 'Color themes'}
        >
          {CRM_THEME_PRESETS.map((preset) => {
            const selected = themeId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`theme-preset-card${selected ? ' is-selected' : ''}`}
                style={themeCssVars(preset.id)}
                onClick={() => setTheme(preset.id)}
              >
                <div className="theme-preset-card__preview">
                  <ThemeMiniChrome />
                </div>
                <div className="theme-preset-card__meta">
                  <span className="theme-preset-card__name">
                    {vi ? preset.vi : preset.en}
                  </span>
                  <span className="theme-preset-card__desc">
                    {vi ? preset.viDesc : preset.enDesc}
                  </span>
                  {selected ? (
                    <span className="theme-preset-card__badge">
                      {vi ? 'Đang dùng' : 'Selected'}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="settings-theme__section" aria-labelledby="settings-theme-font">
        <h2 id="settings-theme-font" className="settings-theme__section-title">
          {vi ? 'Cỡ chữ' : 'Font size'}
        </h2>
        <p className="settings-theme__hint">
          {vi
            ? 'Chọn cỡ chữ để áp dụng ngay toàn CRM (sidebar, tiêu đề, form…). Mỗi nút hiện mẫu chữ ở đúng cỡ đó.'
            : 'Pick a size to apply immediately across the CRM (sidebar, titles, forms…). Each option shows sample text at that size.'}
        </p>
        <div
          className="settings-font-grid"
          role="listbox"
          aria-label={vi ? 'Cỡ chữ' : 'Font size'}
        >
          {CRM_FONT_SIZE_OPTIONS.map((option) => {
            const selected = fontSizeId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`theme-font-card${selected ? ' is-selected' : ''}`}
                onClick={() => setFontSize(option.id)}
              >
                <span
                  className="theme-font-card__sample"
                  style={{ fontSize: option.px }}
                >
                  {vi ? option.viSample : option.enSample}
                </span>
                <span className="theme-font-card__meta">
                  <span className="theme-font-card__name">
                    {vi ? option.vi : option.en}
                  </span>
                  <span className="theme-font-card__px">{option.px}</span>
                </span>
                {selected ? (
                  <span className="theme-font-card__badge">
                    {vi ? 'Đang dùng' : 'Selected'}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
