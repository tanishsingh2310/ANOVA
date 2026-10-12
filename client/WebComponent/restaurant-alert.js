class RestaurantAlert extends HTMLElement {

  constructor() {
    super();

    this.attachShadow({
      mode: "open"
    });
  }


  connectedCallback() {

    this.render();

    this.addCloseEvent();

  }


  render() {

    const type =
      this.getAttribute("type") || "info";

    const message =
      this.getAttribute("message") || "Notification";


    this.shadowRoot.innerHTML = `

      <style>

        .alert {
          display: flex;
          align-items: center;
          gap: 12px;

          padding: 14px 16px;

          margin-bottom: 12px;

          border-radius: 8px;

          border: 1px solid;

          font-family: Arial, sans-serif;

          font-size: 14px;
        }


        .icon {
          width: 28px;
          height: 28px;

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          border-radius: 50%;

          font-weight: bold;
        }


        .message {
          flex: 1;
        }


        .close-button {
          width: 26px;
          height: 26px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: transparent;

          border: none;

          color: inherit;

          font-size: 20px;

          cursor: pointer;

          border-radius: 5px;
        }


        .close-button:hover {
          background: rgba(0, 0, 0, 0.08);
        }


        .success {
          background: #edf7ef;
          color: #356344;
          border-color: #c9e4cf;
        }


        .success .icon {
          background: #d7eddb;
        }


        .warning {
          background: #fbf4e5;
          color: #7c5d22;
          border-color: #ead8a8;
        }


        .warning .icon {
          background: #f2e5c2;
        }


        .error {
          background: #faecec;
          color: #8b4141;
          border-color: #e7c6c6;
        }


        .error .icon {
          background: #f1d5d5;
        }


        .info {
          background: #edf3f7;
          color: #4d6575;
          border-color: #cbdbe5;
        }


        .info .icon {
          background: #dce8ee;
        }

      </style>


      <div class="alert ${type}">

        <div class="icon">
          ${this.getIcon(type)}
        </div>

        <div class="message">
          ${message}
        </div>

        <button
          class="close-button"
          aria-label="Close alert"
        >
          ×
        </button>

      </div>

    `;
  }


  addCloseEvent() {

    const closeButton =
      this.shadowRoot.querySelector(".close-button");


    closeButton.addEventListener("click", () => {

      const message =
        this.getAttribute("message");


      this.dispatchEvent(
        new CustomEvent("alert-closed", {

          bubbles: true,

          detail: {
            message: message
          }

        })
      );


      this.remove();

    });

  }


  getIcon(type) {

    if (type === "success") {
      return "✓";
    }

    if (type === "warning") {
      return "!";
    }

    if (type === "error") {
      return "×";
    }

    return "i";
  }

}


customElements.define(
  "restaurant-alert",
  RestaurantAlert
);