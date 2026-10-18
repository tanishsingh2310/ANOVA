// client/src/modules/customer/components/Stars.jsx
import { stars } from '../utils/format';

export default function Stars({ value }) {
  return <span className="stars" role="img" aria-label={`${value} out of 5`}>{stars(value)}</span>;
}
