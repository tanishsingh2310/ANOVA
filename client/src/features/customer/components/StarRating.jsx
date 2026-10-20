// client/src/modules/customer/components/StarRating.jsx
// A group of real radio buttons, so it works with a keyboard and a screen reader.
export default function StarRating({ name, legend, value, onChange, optional = false }) {
  return (
    <fieldset className="rating">
      <legend>{legend}</legend>
      {optional && (
        <label className="check">
          <input type="radio" name={name} checked={!value} onChange={() => onChange(0)} /> Skip
        </label>
      )}
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="check">
          <input type="radio" name={name} checked={value === n} onChange={() => onChange(n)} />
          {n} <span aria-hidden="true">★</span><span className="sr-only"> star{n > 1 ? 's' : ''}</span>
        </label>
      ))}
    </fieldset>
  );
}
