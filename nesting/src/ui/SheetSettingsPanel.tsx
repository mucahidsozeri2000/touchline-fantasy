import { MATERIALS, type MaterialId } from '../core/materials';
import type { Gravity } from '../core/placement/types';
import { DEFAULT_IMPORT_OPTIONS } from '../core/dxf/types';
import { tr } from '../i18n/tr';
import { SHEET_TEMPLATES, type SheetSettings, type SheetTemplate } from '../state/store';
import { NumberField, Row } from './fields';

const TEMPLATES: SheetTemplate[] = ['1000x2000', '1250x2500', '1500x3000', 'custom'];

export function SheetSettingsPanel({ sheet, onChange }: { sheet: SheetSettings; onChange(p: Partial<SheetSettings>): void }) {
  const t = tr.sheet;
  const mm = t.mm;
  const offset = sheet.kerf / 2 + sheet.gap / 2 + DEFAULT_IMPORT_OPTIONS.chordTolerance + sheet.simplifyTolerance;

  const setSize = (p: Partial<Pick<SheetSettings, 'sizeX' | 'sizeY'>>) => onChange({ ...p, template: 'custom' });

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="text-sm font-semibold text-slate-800">{t.heading}</h3>
        <Row label={t.template}>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            value={sheet.template}
            onChange={(e) => {
              const tpl = e.target.value as SheetTemplate;
              onChange(tpl === 'custom' ? { template: tpl } : { template: tpl, ...SHEET_TEMPLATES[tpl] });
            }}
          >
            {TEMPLATES.map((k) => (
              <option key={k} value={k}>
                {t.templates[k]}
              </option>
            ))}
          </select>
        </Row>
        <Row label={t.sizeY}>
          <NumberField value={sheet.sizeY} onChange={(v) => setSize({ sizeY: v })} min={10} max={20000} className="w-24" suffix={mm} />
        </Row>
        <Row label={t.sizeX}>
          <NumberField value={sheet.sizeX} onChange={(v) => setSize({ sizeX: v })} min={10} max={50000} className="w-24" suffix={mm} />
        </Row>
        <Row label={t.count}>
          <label className="flex items-center gap-1 text-sm text-slate-600">
            <input type="checkbox" checked={sheet.unlimited} onChange={(e) => onChange({ unlimited: e.target.checked })} />
            {t.unlimited}
          </label>
          <NumberField
            value={sheet.count}
            onChange={(v) => onChange({ count: v })}
            min={1}
            max={10000}
            integer
            disabled={sheet.unlimited}
            className="w-16"
          />
        </Row>
        <Row label={t.margin}>
          <NumberField value={sheet.margin} onChange={(v) => onChange({ margin: v })} min={0} max={500} step={0.5} className="w-24" suffix={mm} />
        </Row>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="text-sm font-semibold text-slate-800">{t.cutting}</h3>
        <Row label={t.gap}>
          <NumberField value={sheet.gap} onChange={(v) => onChange({ gap: v })} min={0} max={200} step={0.5} className="w-24" suffix={mm} />
        </Row>
        <Row label={t.kerf} hint={t.offsetHint(tr.format.mm(Math.round(offset * 100) / 100))}>
          <NumberField value={sheet.kerf} onChange={(v) => onChange({ kerf: v })} min={0} max={20} step={0.05} className="w-24" suffix={mm} />
        </Row>
        <Row label={t.gravity}>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            value={sheet.gravity}
            onChange={(e) => onChange({ gravity: e.target.value as Gravity })}
          >
            {(['left', 'down'] as Gravity[]).map((g) => (
              <option key={g} value={g}>
                {t.gravities[g]}
              </option>
            ))}
          </select>
        </Row>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="text-sm font-semibold text-slate-800">{t.material}</h3>
        <Row label={t.material}>
          <select
            className="max-w-44 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            value={sheet.material}
            onChange={(e) => onChange({ material: e.target.value as MaterialId })}
          >
            {MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>
                {tr.materials[m.id]}
              </option>
            ))}
          </select>
        </Row>
        <Row label={t.thickness} hint={t.reportOnly}>
          <NumberField value={sheet.thickness} onChange={(v) => onChange({ thickness: v })} min={0.1} max={200} step={0.5} className="w-24" suffix={mm} />
        </Row>
      </section>

      <details className="rounded-lg border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">{t.advanced}</summary>
        <div className="mt-3 flex flex-col gap-3">
          <Row label={t.simplify} hint={t.simplifyHint}>
            <NumberField
              value={sheet.simplifyTolerance}
              onChange={(v) => onChange({ simplifyTolerance: v })}
              min={0}
              max={5}
              step={0.05}
              className="w-24"
              suffix={mm}
            />
          </Row>
        </div>
      </details>
    </div>
  );
}
