import { useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { clearToken, getRole } from "../../modules/customer/utils/session";
import { useCart } from "../../modules/customer/context/CartContext";

const PAGE_TITLES = {
  "/admin": "Executive Dashboard",
  "/": "Home",
  "/branches": "Choose a Branch",
  "/menu": "Culinary Menu",
  "/offers": "Special Offers",
  "/cart": "Your Cart",
  "/checkout": "Checkout",
  "/orders": "My Orders",
  "/feedback": "Guest Feedback",
  "/profile": "Customer Profile",
  "/admin/deliveries": "Deliveries Management",
  "/admin/coupons": "Promotions & Coupons",
  "/admin/feedback": "Feedback Moderation",
  "/admin/reports": "Business Intelligence & Reports",
  "/deliveries": "My Deliveries",
  "/dev-login": "Developer Sign-In",
};

const ROLE_LABELS = {
  owner: "Owner",
  admin: "Administrator",
  manager: "Branch Manager",
  delivery: "Delivery Partner",
  customer: "Guest",
};

const STAFF = ["owner", "admin", "manager"];

function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const cart = useCart();
  const role = getRole();

  const isDelivery = role === "delivery";
  const isStaff = STAFF.includes(role);

  const title = PAGE_TITLES[location.pathname] || "Customer Management";

  const eyebrow = isDelivery
    ? "ANOVA / DELIVERY PARTNER DISPATCH"
    : isStaff
    ? "ANOVA / RESTAURANT & OPERATIONS MANAGEMENT"
    : "ANOVA / CUSTOMER ORDERING & HOSPITALITY";

  const roleText = ROLE_LABELS[role] || "Guest Customer";
  const avatarInitials = isDelivery
    ? "DL"
    : isStaff
    ? role === "manager"
      ? "MG"
      : "AD"
    : "CU";

  function handleLogout() {
    clearToken();
    if (cart) cart.reset();
    navigate("/dev-login");
  }

  return (
    <header className="anova-topbar">
      <div className="anova-topbar-heading">
        <p className="anova-topbar-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>

      <div className="anova-topbar-actions">
        <div className="anova-branch-indicator">
          <span className="anova-branch-dot"></span>
          <span>Main Branch Overview</span>
        </div>

        <div className="anova-profile">
          <div className="anova-profile-avatar">{avatarInitials}</div>

          <div className="anova-profile-info">
            <strong>{roleText}</strong>
            <span>Active Session</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          title="Sign out"
          style={{
            background: "transparent",
            border: "1px solid var(--color-border, #E2E7E1)",
            padding: "7px 12px",
            borderRadius: "var(--radius-sm, 6px)",
            color: "var(--color-text-secondary, #53635B)",
            cursor: "pointer",
            fontSize: "12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <LogOut size={13} /> Exit
        </button>
      </div>
    </header>
  );
}

export default Topbar;