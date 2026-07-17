import { h } from "preact";
import { NO_BG_SVG } from "../lib/constants";

interface BgEntry {
  file: string;
  position: string | null;
}

interface Props {
  backgrounds: (BgEntry | null)[];
  selected: number;
  onSelect: (i: number) => void;
  bgUrls: Record<string, string>;
}

export function BackgroundsBar({ backgrounds, selected, onSelect, bgUrls }: Props) {
  return (
    <div id="backgrounds">
      {backgrounds.map((bg, i) => (
        <div
          key={i}
          className={`bg-thumb${i === selected ? " selected" : ""}`}
          style={bg ? `background-image:url("${bgUrls[bg.file] || NO_BG_SVG}")` : `background-image:url("${NO_BG_SVG}")`}
          onClick={() => onSelect(i)}
        />
      ))}
    </div>
  );
}
