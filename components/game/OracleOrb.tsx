import { Sparkles } from "lucide-react";

type OracleOrbProps = {
  mode?: "resting" | "thinking" | "guessing" | "celebrating" | "dim";
  size?: "small" | "medium" | "large";
};

export function OracleOrb({ mode = "resting", size = "medium" }: OracleOrbProps) {
  return (
    <div className={`oracle-orb oracle-orb--${mode} oracle-orb--${size}`} aria-hidden="true">
      <div className="oracle-orb__aura" />
      <div className="oracle-orb__orbit oracle-orb__orbit--one">
        <i />
      </div>
      <div className="oracle-orb__orbit oracle-orb__orbit--two">
        <i />
      </div>
      <div className="oracle-orb__shell">
        <div className="oracle-orb__mist" />
        <div className="oracle-orb__core">
          <Sparkles className="oracle-orb__spark" strokeWidth={1.35} />
        </div>
      </div>
      <div className="oracle-orb__shadow" />
    </div>
  );
}
