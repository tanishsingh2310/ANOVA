// client/src/modules/customer/pages/Home.jsx  (customer landing page)
// Optional hero photo: set --hero-image in anova-theme.css to url(...) of your own food image.
import { Link } from 'react-router-dom';
import Icon from '../../../components/shell/Icon';

const FEATURES = [
  { icon: 'pin', title: 'Choose your branch', text: 'Pick the ANOVA branch nearest you and see its own menu, hours and ratings.' },
  { icon: 'truck', title: 'Follow your order live', text: 'Watch your rider move across the map from the kitchen to your door.' },
  { icon: 'tag', title: 'Offers and rewards', text: 'Apply an offer code at checkout and see the saving before you order.' },
];

export default function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <p className="kicker">Multi-branch restaurant &amp; enterprise management system</p>
        <h1 id="hero-title">The art of <em>intelligent</em> hospitality</h1>
        <p className="hero-sub">
          Order delivery or takeaway from your nearest ANOVA branch, and follow every step from kitchen to doorstep.
        </p>
        <div className="actions">
          <Link className="btn" to="/branches">Order now</Link>
          <Link className="btn ghost" to="/offers">See offers</Link>
        </div>
      </section>

      <div className="page">
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature">
              <span className="feature-icon"><Icon name={f.icon} size={22} /></span>
              <h3>{f.title}</h3>
              <p className="muted">{f.text}</p>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
