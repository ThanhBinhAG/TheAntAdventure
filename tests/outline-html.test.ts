import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildOutlineHTML, fmtOutlineDate } from '../lib/outline/outline-html';

describe('outline-html', () => {
  it('fmtOutlineDate formats ISO date as en-GB short', () => {
    assert.equal(fmtOutlineDate('2027-01-14'), '14 Jan 2027');
    assert.equal(fmtOutlineDate(''), '');
  });

  it('buildOutlineHTML includes title and five column headers', () => {
    const html = buildOutlineHTML({
      clientName: 'Talent',
      rows: [
        {
          dayNumber: 1,
          date: '2027-01-14',
          location: 'Hoian - Hue',
          activities: 'Pick up at Hoian',
          hotels: 'Pilgrimage - 01 Double Room',
        },
      ],
    });
    assert.match(html, /OUTLINE TO SEND TO GUESTS/);
    assert.match(html, /#00CCFF/i);
    assert.match(html, /DAY/);
    assert.match(html, /DATE/);
    assert.match(html, /LOCATION/);
    assert.match(html, /ITINERARY/);
    assert.match(html, /HOTELS/);
    assert.match(html, /14 Jan 2027/);
    assert.match(html, /Hoian - Hue/);
    assert.match(html, /Pilgrimage/);
  });
});
