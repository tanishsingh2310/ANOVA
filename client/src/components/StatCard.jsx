function StatCard({ title, value, description }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span>{title}</span>
      </div>

      <h3>{value}</h3>

      <p>{description}</p>
    </div>
  );
}

export default StatCard;