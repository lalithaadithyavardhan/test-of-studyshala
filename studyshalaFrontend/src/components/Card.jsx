const Card = ({ title, children, className = '', headerAction }) => {
  return (
    <div className={`card ${className}`.trim()}>
      {title && (
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
