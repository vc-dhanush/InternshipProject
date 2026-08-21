export default function BrandMark({ kind = "app", src, name }) {
  const label = kind === "college" ? "COLLEGE LOGO" : "APP LOGO";
  const alt = name || label;
  return (
    <div className={`brand-mark ${kind}`} title={label}>
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        <span className="brand-mark-fallback">{label}</span>
      )}
    </div>
  );
}
