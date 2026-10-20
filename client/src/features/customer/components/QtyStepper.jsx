// client/src/modules/customer/components/QtyStepper.jsx
export default function QtyStepper({ name, quantity, onChange }) {
  return (
    <div className="stepper" role="group" aria-label={`Quantity of ${name}`}>
      <button className="secondary" aria-label={`Remove one ${name}`} onClick={() => onChange(quantity - 1)}>-</button>
      <span aria-live="polite">{quantity}</span>
      <button className="secondary" aria-label={`Add one ${name}`} onClick={() => onChange(quantity + 1)}>+</button>
    </div>
  );
}
