"use client";

import { PALETTE } from "@/lib/buttonStyle";

// Seletor de cor sem digitar código: grade de amostras + (opcional) um
// seletor nativo (roda de cores) para uma cor específica.
type Props = {
  value: string;
  onChange: (hex: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PALETTE.map((c) => {
        const selected = value?.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Cor ${c}`}
            title={c}
            style={{ backgroundColor: c }}
            className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${
              selected
                ? "ring-2 ring-[var(--accent)] ring-offset-1"
                : "border-[var(--border)]"
            }`}
          />
        );
      })}

      {/* Cor específica (roda de cores nativa — também sem digitar) */}
      <label
        className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-[var(--text-subtle)]"
        title="Escolher outra cor"
        style={{
          background:
            "conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red)",
        }}
      >
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
