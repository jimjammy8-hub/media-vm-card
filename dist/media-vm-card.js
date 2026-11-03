class MediaVmCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity || !config.vmid || !config.node || !config.host) {
      throw new Error("Wymagane: entity, vmid, node, host");
    }
    this._config = config;
    this._mode = "off";          // off | console
    this._iframeLoaded = false;
    if (!this._root) {
      this._root = this.attachShadow({ mode: "open" });
      this._root.innerHTML = `
        <style>
          :host { display:block; }
          ha-card { background:#000; color:#fff; overflow:hidden; height:100%; }
          .off { display:flex; align-items:center; justify-content:center; height:300px; }
          .power {
            width:180px; height:180px; border-radius:50%;
            border:6px solid #3fa9f5; background:transparent; color:#3fa9f5;
            cursor:pointer; display:flex; align-items:center; justify-content:center;
            transition: background .2s, transform .15s;
          }
          .power:hover { background:#3fa9f5; color:#000; transform:scale(1.05); }
          .power svg { width:96px; height:96px; }
          .console { position:relative; height:480px; }
          iframe { width:100%; height:100%; border:0; background:#000; }
          .bar { display:flex; justify-content:space-between; align-items:center;
                 padding:8px 12px; background:#111; font: 14px sans-serif; }
          button.stop {
            background:#b3261e; color:#fff; border:0; border-radius:8px;
            padding:8px 14px; cursor:pointer; font-size:14px;
          }
          .msg { padding:20px; font:14px sans-serif; color:#aaa; }
        </style>
        <ha-card>
          <div id="body"></div>
        </ha-card>`;
    }
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 6; }

  _isRunning() {
    const s = this._hass?.states[this._config.entity];
    return s && (s.state === "on" || s.state === "running");
  }

  _start() {
    this._hass.callService("rest_command", "proxmox_start_media", {});
    this._mode = "console";
    this._iframeLoaded = false;
    this._render();
  }

  _stop() {
    this._hass.callService("rest_command", "proxmox_stop_media", {});
    this._mode = "off";
    this._iframeLoaded = false;
    this._render();
  }

  _render() {
    if (!this._root || !this._hass || !this._config) return;
    const body = this._root.getElementById("body");
    const showConsole = this._mode === "console" || this._isRunning();

    if (!showConsole) {
      body.innerHTML = `
        <div class="off">
          <button class="power" title="Uruchom">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M12 2v10"/><path d="M5.6 6.6a9 9 0 1 0 12.8 0"/>
            </svg>
          </button>
        </div>`;
      body.querySelector(".power").onclick = () => this._start();
      return;
    }

    const url = `https://${this._config.host}:8006/?console=kvm&novnc=1&vmid=${this._config.vmid}&node=${this._config.node}&resize=scale`;
    body.innerHTML = `
      <div class="bar">
        <span>${this._config.name || "VM " + this._config.vmid}</span>
        <button class="stop">Wyłącz</button>
      </div>
      <div class="console">
        <iframe src="${url}" allow="fullscreen"></iframe>
      </div>
      <div class="msg">Jeśli podgląd jest pusty, zaloguj się najpierw do Proxmoxa w tej przeglądarce albo otwórz konsolę w nowym oknie.</div>`;
    body.querySelector(".stop").onclick = () => this._stop();
  }
}

customElements.define("media-vm-card", MediaVmCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "media-vm-card",
  name: "Media VM Card",
  description: "Przycisk power i podgląd konsoli VM w Proxmoxie",
});
