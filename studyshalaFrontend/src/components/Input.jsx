const Input = ({ 
  label, 
  error, 
  type = 'text', 
  className = '',
  ...props 
}) => {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <input 
        type={type}
        className={`form-input ${className}`.trim()}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
};

export default Input;
