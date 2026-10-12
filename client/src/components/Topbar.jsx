function Topbar({ activePage }) {
  return (
    <header className="topbar">

      <div>

        <h1>
          {activePage}
        </h1>

        <p>
          Overview of your restaurant operations
        </p>

      </div>


      <div className="topbar-right">

        <div className="branch-selector">

          <span>
            Branch
          </span>

          <select>

            <option>
              Vadodara Branch
            </option>

            <option>
              Ahmedabad Branch
            </option>

            <option>
              Surat Branch
            </option>

          </select>

        </div>


        <button className="notification-button">

          ♢

          <span className="notification-dot"></span>

        </button>

      </div>

    </header>
  );
}

export default Topbar;