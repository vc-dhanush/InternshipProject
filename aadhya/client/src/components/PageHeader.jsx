export default function PageHeader({ eyebrow, title, text, actions }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
        <h2 className="page-heading">{title}</h2>
        {text ? <p className="muted page-lede">{text}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}
