"use strict";(()=>{var d={async _req(e,t,s,n=6e4){let a=new AbortController,i=setTimeout(()=>a.abort(),n),l={method:e,headers:{"Content-Type":"application/json"},signal:a.signal};s!==void 0&&(l.body=JSON.stringify(s));try{let c=await fetch("/api"+t,l);clearTimeout(i);let r=c.status===204?null:await c.json().catch(()=>null);if(c.status===401)return window.location.href="/login?msg=Your+session+has+expired+%E2%80%94+please+log+in+again",null;if(!c.ok)throw new Error(r?.error||`HTTP ${c.status}`);return r}catch(c){throw clearTimeout(i),c}},get:e=>d._req("GET",e),post:(e,t)=>d._req("POST",e,t),put:(e,t)=>d._req("PUT",e,t),delete:e=>d._req("DELETE",e)};var K=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',S=e=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${e}</div>
    </div>`,M=(e,t)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${e}; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,$=e=>{let t={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[s,n]=t[e]||["stopped","Unknown"];return`<span class="kp-status kp-status-${s}">${n}</span>`},ve=e=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[e]||"?",_=e=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET"})[e]||"?",E=()=>window.KP.user.role===window.KP.roles.admin,P=e=>{switch(e.SiteType){case 1:case 2:return`PHP ${ve(e.PHPVersion)}`;case 4:return`Node ${{1:"20",2:"22",3:"23"}[e.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[e.RuntimeVersion]||"?"}`;default:return""}},T=e=>({id:e.id??e.ID,uname:e.uname??e.UName,uhash:e.uhash??e.UHash,fname:e.fname??e.FName,lname:e.lname??e.LName,email:e.email??e.Email,phone:e.phone??e.Phone,role:e.role??e.Role,totp_enabled:e.totp_enabled??!1,created:e.created??e.Created});function w(e,t){return new Promise(s=>{document.getElementById("kp-confirm-title").textContent=e,document.getElementById("kp-confirm-message").textContent=t;let n=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{n.hide(),s(!0)},{once:!0}),n.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>s(!1),{once:!0})})}function y(e,t){let s=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${e}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${t}</p>
                <p class="kp-muted">
                    This may take several minutes while images are pulled and containers are initialized.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",s),UIkit.modal("#kp-progress-modal").show()}function f(){let e=document.getElementById("kp-progress-modal");e&&(UIkit.modal(e).hide(),setTimeout(()=>e.remove(),300))}var u={routes:{},register(e,t){this.routes[e]=t},async go(e,t={}){let s=Object.keys(t).length?e+"/"+Object.values(t).join("/"):e;window.location.hash=s,document.querySelectorAll(".kp-nav-link").forEach(i=>{i.classList.toggle("kp-active",i.dataset.view===e)});let n=this.routes[e];if(!n)return;let a=document.getElementById("kp-view");a.innerHTML=K();try{await n(a,t)}catch(i){a.innerHTML=S(i.message)}}};function O(){let t=(window.location.hash.replace("#","")||"dashboard").split("/"),s=t[0],n={};return s==="site-detail"&&t[1]&&(n.id=t[1]),{view:s,params:n}}var o={show(e,t="info",s=7e3){let n={success:"check",error:"warning",info:"info"},a=document.createElement("div");a.className=`kp-toast kp-toast-${t}`,a.innerHTML=`<span uk-icon="${n[t]||"info"}"></span><span>${e}</span>`,document.getElementById("kp-toasts").appendChild(a),UIkit.icon(a.querySelector("[uk-icon]")),setTimeout(()=>a.remove(),s)},success:e=>o.show(e,"success"),error:e=>o.show(e,"error"),info:e=>o.show(e,"info")};async function q(e){let t=`
        <div id="kp-edit-site-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit Site \u2014 ${e.Name}</h3>
                <form id="edit-site-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Name</label>
                            <input class="uk-input kp-input" name="name" type="text" value="${e.Name}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Type</label>
                            <select class="uk-select kp-select" name="site_type" id="es-site-type">
                                <option value="1" ${e.SiteType===1?"selected":""}>PHP</option>
                                <option value="3" ${e.SiteType===3?"selected":""}>Static HTML</option>
                                <option value="4" ${e.SiteType===4?"selected":""}>Node.js</option>
                                <option value="5" ${e.SiteType===5?"selected":""}>.NET</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s" id="es-php-version-wrap">
                            <label class="kp-label">PHP Version</label>
                            <select class="uk-select kp-select" name="php_version">
                                <option value="3" ${e.PHPVersion===3?"selected":""}>PHP 8.2</option>
                                <option value="4" ${e.PHPVersion===4?"selected":""}>PHP 8.3</option>
                                <option value="5" ${e.PHPVersion===5?"selected":""}>PHP 8.4</option>
                                <option value="6" ${e.PHPVersion===6?"selected":""}>PHP 8.5</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="es-node-version-wrap">
                            <label class="kp-label">Node.js Version</label>
                            <select class="uk-select kp-select" name="node_version">
                                <option value="2" ${e.RuntimeVersion===2?"selected":""}>Node 22 (LTS)</option>
                                <option value="4" ${e.RuntimeVersion===4?"selected":""}>Node 24</option>
                                <option value="5" ${e.RuntimeVersion===5?"selected":""}>Node 25</option>
                                <option value="6" ${e.RuntimeVersion===6?"selected":""}>Node 26</option>                                
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="es-dotnet-version-wrap">
                            <label class="kp-label">.NET Version</label>
                            <select class="uk-select kp-select" name="dotnet_version">
                                <option value="1" ${e.RuntimeVersion===1?"selected":""}>.NET 8.0 (LTS)</option>
                                <option value="2" ${e.RuntimeVersion===2?"selected":""}>.NET 9.0</option>
                                <option value="3" ${e.RuntimeVersion===3?"selected":""}>.NET 10.0 (LTS)</option>
                            </select>
                        </div>
                        <div class="uk-width-1-1 uk-hidden" id="es-start-command-wrap">
                            <label class="kp-label">Start Command</label>
                            <input class="uk-input kp-input" name="start_command" type="text" value="${e.StartCommand||""}">
                        </div>
                        <div class="uk-width-1-1 ${e.SiteType!==1?"uk-hidden":""}" id="es-wordpress-wrap">
                            <label><input class="uk-checkbox" type="checkbox" name="install_wordpress" checked> WordPress</label>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",t);let s=UIkit.modal("#kp-edit-site-modal"),n=document.getElementById("es-site-type"),a=document.getElementById("es-php-version-wrap"),i=document.getElementById("es-node-version-wrap"),l=document.getElementById("es-dotnet-version-wrap"),c=document.getElementById("es-start-command-wrap"),r=document.getElementById("es-wordpress-wrap");s.show();let p=m=>{a.classList.toggle("uk-hidden",m!==1&&m!==2),i.classList.toggle("uk-hidden",m!==4),l.classList.toggle("uk-hidden",m!==5),c.classList.toggle("uk-hidden",m!==4&&m!==5),r.classList.toggle("uk-hidden",m!==1)};p(e.SiteType),n.addEventListener("change",()=>p(parseInt(n.value))),document.getElementById("edit-site-form").addEventListener("submit",async m=>{m.preventDefault();let g=m.target.querySelector('[type="submit"]'),k=g.innerHTML;g.disabled=!0,g.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let v=new FormData(m.target),b=parseInt(v.get("site_type")),h=null;b===4&&(h=parseInt(v.get("node_version"))),b===5&&(h=parseInt(v.get("dotnet_version")));let x={name:v.get("name").trim(),php_version:parseInt(v.get("php_version"))||3,site_type:b,runtime_version:h,start_command:v.get("start_command")?.trim()||""},ge=b===1?v.get("install_wordpress")==="on":!1;try{await d.put(`/sites/${e.ID}`,x),s.hide(),document.getElementById("kp-edit-site-modal")?.remove(),y("Applying Changes","Saving changes and recreating pod...");try{await d.post(`/sites/${e.ID}/recreate`,{install_wordpress:ge}),f(),o.success("Site updated and pod recreated")}catch(j){f(),o.error("Site saved but pod recreate failed: "+j.message)}u.go("site-detail",{id:String(e.ID)})}catch(j){o.error(j.message),g.disabled=!1,g.innerHTML=k}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}function H(){document.body.insertAdjacentHTML("beforeend",`
        <div id="kp-create-site-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">New Site</h3>
                <form id="create-site-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Name</label>
                            <input class="uk-input kp-input" name="name" type="text" placeholder="mysite" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Type</label>
                            <select class="uk-select kp-select" name="site_type" id="cs-site-type">
                                <option value="1">PHP</option>
                                <option value="3">Static HTML</option>
                                <option value="4">Node.js</option>
                                <option value="5">.NET</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s" id="cs-php-version-wrap">
                            <label class="kp-label">PHP Version</label>
                            <select class="uk-select kp-select" name="php_version">
                                <option value="3" selected>PHP 8.2</option>
                                <option value="4">PHP 8.3</option>
                                <option value="5">PHP 8.4</option>
                                <option value="6">PHP 8.5</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="cs-node-version-wrap">
                            <label class="kp-label">Node.js Version</label>
                            <select class="uk-select kp-select" name="node_version">
                                <option value="2" selected>Node 22 (LTS)</option>
                                <option value="4">Node 24</option>
                                <option value="5">Node 25</option>
                                <option value="6">Node 26</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="cs-dotnet-version-wrap">
                            <label class="kp-label">.NET Version</label>
                            <select class="uk-select kp-select" name="dotnet_version">
                                <option value="1">.NET 8.0 (LTS)</option>
                                <option value="2">.NET 9.0</option>
                                <option value="3" selected>.NET 10.0 (LTS)</option>
                            </select>
                        </div>
                        <div class="uk-width-1-1 uk-hidden" id="cs-start-command-wrap">
                            <label class="kp-label">Start Command</label>
                            <input class="uk-input kp-input" name="start_command" type="text" placeholder="node server.js or dotnet MyApp.dll">
                        </div>
                        <div class="uk-width-1-1" id="cs-wordpress-wrap">
                            <label><input class="uk-checkbox" type="checkbox" name="install_wordpress" checked> Install WordPress</label>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label">Domains (one per line)</label>
                            <textarea class="uk-textarea kp-textarea" name="domains" rows="3" placeholder="example.com&#10;www.example.com"></textarea>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="server"></span> Create Site
                        </button>
                    </div>
                </form>
            </div>
        </div>`);let t=UIkit.modal("#kp-create-site-modal"),s=document.getElementById("cs-site-type"),n=document.getElementById("cs-php-version-wrap"),a=document.getElementById("cs-node-version-wrap"),i=document.getElementById("cs-dotnet-version-wrap"),l=document.getElementById("cs-start-command-wrap"),c=document.getElementById("cs-wordpress-wrap");t.show(),s.addEventListener("change",()=>{let r=parseInt(s.value);n.classList.toggle("uk-hidden",r!==1&&r!==2),a.classList.toggle("uk-hidden",r!==4),i.classList.toggle("uk-hidden",r!==5),l.classList.toggle("uk-hidden",r!==4&&r!==5),c.classList.toggle("uk-hidden",r!==1)}),document.getElementById("create-site-form").addEventListener("submit",async r=>{r.preventDefault();let p=r.target.querySelector('[type="submit"]'),m=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let g=new FormData(r.target),k=parseInt(g.get("site_type")),v=null;k===4&&(v=parseInt(g.get("node_version"))),k===5&&(v=parseInt(g.get("dotnet_version")));let b={name:g.get("name").trim(),php_version:parseInt(g.get("php_version"))||3,site_type:k,runtime_version:v,start_command:g.get("start_command")?.trim()||"",domains:g.get("domains").split(`
`).map(h=>h.trim()).filter(Boolean),install_wordpress:k===1?g.get("install_wordpress")==="on":!1};t.hide(),document.getElementById("kp-create-site-modal")?.remove(),y("Creating Site",`Setting up '${b.name}' \u2014 pulling images and provisioning containers...`);try{await d.post("/sites",b),f(),o.success(`Site '${b.name}' created`),u.go("sites")}catch(h){f(),o.error(h.message),p.disabled=!1,p.innerHTML=m}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}async function Q(e){let t=await d.get("/sites")??[];e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Sites</h1>
            <button class="uk-button kp-btn-primary" id="sites-new-btn">
                <span uk-icon="plus"></span> New Site
            </button>
        </div>
        <div class="kp-site-grid">
            ${t.length===0?M("world","No sites yet \u2014 create one to get started"):t.map(W).join("")}
        </div>`,document.getElementById("sites-new-btn").addEventListener("click",()=>H())}function W(e){let t=e.Domains?.[0]??null;return`
        <div class="kp-site-card" data-site-id="${e.ID}" data-status="${e.SiteStatus}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${e.ID}">${e.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${e.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${_(e.SiteType)}${P(e)?" / "+P(e):""}</span>
                        ${t?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${t}" target="_blank" style="color:var(--kp-cyan)">${t}</a></span>`:""}
                    </div>
                </div>
                ${$(e.SiteStatus)}
            </div>
            <div class="kp-site-actions">
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="manage" data-id="${e.ID}" uk-tooltip="Manage This Site"><span uk-icon="icon: settings;"></span></button>
                ${e.SiteStatus===1?`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="stop" data-id="${e.ID}" uk-tooltip="Stop the Site"><span uk-icon="icon: ban;"></span></button>`:`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="start" data-id="${e.ID}" uk-tooltip="Start the Site"><span uk-icon="icon: play;"></span></button>`}
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="restart" data-id="${e.ID}" uk-tooltip="Restart the Site"><span uk-icon="icon: refresh;"></span></button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="flush" data-id="${e.ID}" title="Flush cache" uk-tooltip="Flush the Caches"><span uk-icon="icon: bolt;"></span></button>
                <div class="kp-site-actions-break"></div>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="recreate" data-id="${e.ID}" title="Recreate pod" uk-tooltip="Recreate the Pod"><span uk-icon="icon: history;"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit" data-id="${e.ID}" title="Edit" uk-tooltip="Edit the Site"><span uk-icon="icon: pencil;"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="delete" data-id="${e.ID}" title="Delete" uk-tooltip="Delete the Site"><span uk-icon="icon: trash;"></span></button>
            </div>
        </div>`}async function G(e){let t=await d.get("/sites")??[],s=t.filter(i=>i.SiteStatus===1).length,n=t.filter(i=>i.SiteStatus===2).length,a=t.filter(i=>i.SiteStatus===4).length;e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Dashboard</h1>
        </div>
        <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-medium-bottom" uk-grid>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value">${t.length}</div>
                            <div class="kp-stat-label">Total Sites</div>
                        </div>
                        <span class="kp-stat-icon" uk-icon="icon: world; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-success)">${s}</div>
                            <div class="kp-stat-label">Running</div>
                        </div>
                        <span style="color:var(--kp-success)" uk-icon="icon: check; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-text-dim)">${n}</div>
                            <div class="kp-stat-label">Stopped</div>
                        </div>
                        <span style="color:var(--kp-text-dim)" uk-icon="icon: ban; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-danger)">${a}</div>
                            <div class="kp-stat-label">Errors</div>
                        </div>
                        <span style="color:var(--kp-danger)" uk-icon="icon: warning; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
        </div>
        <div class="kp-view-header">
            <h2 class="kp-view-title" style="font-size:1.25rem">Recent Sites</h2>
            <button class="uk-button kp-btn-primary" id="dash-new-site">
                <span uk-icon="plus"></span> New Site
            </button>
        </div>
        <div class="kp-site-grid">
            ${t.length===0?M("world","No sites yet"):t.slice(0,6).map(W).join("")}
        </div>`,document.getElementById("dash-new-site")?.addEventListener("click",()=>H())}function R(e=null){let t=e?`/sites/${e}/security/ip`:"/security/ip",s=e?`/sites/${e}/security/ua`:"/security/ua";return`
        <div id="security-panel" data-ip-base="${t}" data-ua-base="${s}">

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">IP Rules</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api${t}/export" download="${e?`site-${e}-ip-rules.csv`:"podnest-global-ip-rules.csv"}" uk-tooltip="Export IP rules as CSV">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import IP rules from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-ip-import" accept=".csv" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-ip-save" uk-tooltip="Save the IP Rules">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One IP address or CIDR block per line (e.g. <span class="kp-mono">1.2.3.4</span>
                    or <span class="kp-mono">10.0.0.0/8</span>).
                    Blacklist always wins \u2014 a blacklisted IP cannot be whitelisted.
                    Whitelist is disabled when empty.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ip-whitelist" rows="6"
                            placeholder="# allow only these IPs&#10;1.2.3.4&#10;10.0.0.0/8"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ip-blacklist" rows="6"
                            placeholder="# block these IPs&#10;5.6.7.8&#10;192.168.99.0/24"></textarea>
                    </div>
                </div>
            </div>

            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">User-Agent Rules</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api${s}/export" download="${e?`site-${e}-ua-rules.csv`:"podnest-global-ua-rules.csv"}" uk-tooltip="Export UA rules as CSV">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import UA rules from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-ua-import" accept=".csv" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-ua-save" uk-tooltip="Save the User-Agent Rules">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One substring per line \u2014 matched case-insensitively against the full User-Agent header.
                    Blacklist always wins. Whitelist is disabled when empty.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ua-whitelist" rows="6"
                            placeholder="# allow only these agents&#10;mozilla&#10;googlebot"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ua-blacklist" rows="6"
                            placeholder="# block these agents&#10;sqlmap&#10;nikto&#10;masscan"></textarea>
                    </div>
                </div>
            </div>

        </div>`}async function L(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,n=t.dataset.uaBase;try{let[a,i]=await Promise.all([d.get(s),d.get(n)]);e.querySelector("#sec-ip-whitelist").value=a.whitelist??"",e.querySelector("#sec-ip-blacklist").value=a.blacklist??"",e.querySelector("#sec-ua-whitelist").value=i.whitelist??"",e.querySelector("#sec-ua-blacklist").value=i.blacklist??""}catch(a){o.error("Failed to load security rules: "+a.message)}}function N(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,n=t.dataset.uaBase;e.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let a=e.querySelector("#sec-ip-save"),i=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(s,{whitelist:e.querySelector("#sec-ip-whitelist").value,blacklist:e.querySelector("#sec-ip-blacklist").value}),o.success("IP rules saved")}catch(l){o.error(l.message)}finally{a.disabled=!1,a.innerHTML=i}}),e.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let a=e.querySelector("#sec-ua-save"),i=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(n,{whitelist:e.querySelector("#sec-ua-whitelist").value,blacklist:e.querySelector("#sec-ua-blacklist").value}),o.success("UA rules saved")}catch(l){o.error(l.message)}finally{a.disabled=!1,a.innerHTML=i}}),e.querySelector("#sec-ip-import")?.addEventListener("change",async a=>{let i=a.target.files[0];if(!i)return;let l=new FormData;l.append("file",i);try{let c=await fetch(s+"/import",{method:"POST",body:l}),r=c.status===204?null:await c.json().catch(()=>null);if(!c.ok)throw new Error(r?.error||`HTTP ${c.status}`);await L(e),o.success("IP rules imported")}catch(c){o.error(c.message)}finally{a.target.value=""}}),e.querySelector("#sec-ua-import")?.addEventListener("change",async a=>{let i=a.target.files[0];if(!i)return;let l=new FormData;l.append("file",i);try{let c=await fetch(n+"/import",{method:"POST",body:l}),r=c.status===204?null:await c.json().catch(()=>null);if(!c.ok)throw new Error(r?.error||`HTTP ${c.status}`);await L(e),o.success("UA rules imported")}catch(c){o.error(c.message)}finally{a.target.value=""}})}async function Y(e){if(!E()){e.innerHTML=S("Access denied");return}e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 a blacklisted entry cannot be overridden by any whitelist.
        </p>
        ${R(null)}`,N(e),L(e)}function he(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function J(e){let t=document.getElementById("admin-domain-ssl");if(!(!t||!e))try{let s=await d.get(`/ssl-status?domain=${encodeURIComponent(e)}`);t.outerHTML=he(s.status)}catch{}}async function F(e){if(!E()){e.innerHTML=S("Access denied");return}let[t,s]=await Promise.all([d.get("/settings"),d.get("/settings/backup")]);e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Settings</h1>
        </div>

        <!-- panel configuration -->
        <div class="kp-card uk-padding kp-settings-wrap">
            <h3 class="kp-view-title uk-margin-bottom">Panel Configuration</h3>
            <form id="settings-form" class="uk-form-stacked">
                <div class="uk-margin">
                    <label class="kp-label" for="admin-domain">Management UI Domain</label>
                    <div class="uk-flex kp-settings-domain-wrap">
                        <span id="admin-domain-ssl" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
                        <input
                            class="uk-input kp-input"
                            id="admin-domain"
                            name="admin_domain"
                            type="text"
                            placeholder="panel.example.com"
                            value="${t.admin_domain??""}">
                    </div>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        When set, the proxy will route this domain to the management UI and issue
                        a Let's Encrypt certificate automatically. Leave blank to disable.
                    </p>
                </div>
                <div class="uk-flex uk-flex-right uk-margin-top">
                    <button type="submit" class="uk-button kp-btn-primary">
                        <span uk-icon="check"></span> Save Settings
                    </button>
                </div>
                <hr class="kp-divider uk-margin-top">
                <div class="uk-flex uk-flex-middle" style="gap:10px;flex-wrap:wrap">
                    <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/export" download="podnest-settings.csv" uk-tooltip="Export settings as CSV">
                        <span uk-icon="download"></span> Export CSV
                    </a>
                    <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import settings from CSV">
                        <span uk-icon="upload"></span> Import CSV
                        <input type="file" id="settings-import-file" accept=".csv" style="display:none">
                    </label>
                </div>
            </form>
        </div>

        <!-- backup schedule / retention -->
        <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">Backup Schedule</h3>
            <form id="backup-form" class="uk-form-stacked">
                <div class="uk-margin">
                    <label class="kp-label" for="backup-schedule">Cron Schedule</label>
                    <input
                        class="uk-input kp-input kp-mono"
                        id="backup-schedule"
                        name="backup_schedule"
                        type="text"
                        placeholder="0 2 * * *"
                        value="${s.backup_schedule??""}">
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Standard 5-field cron expression. Leave blank to disable automatic backups.<br>
                        Examples: <span class="kp-mono">0 2 * * *</span> (daily at 2am) &nbsp;
                        <span class="kp-mono">0 */6 * * *</span> (every 6 hours)
                    </p>
                </div>
                <div class="uk-margin">
                    <label class="kp-label" for="backup-retain-days">Retain Backups (days)</label>
                    <input
                        class="uk-input kp-input"
                        id="backup-retain-days"
                        name="backup_retain_days"
                        type="number"
                        min="1"
                        max="365"
                        placeholder="30"
                        value="${s.backup_retain_days??"30"}">
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Snapshots older than this many days will be pruned automatically after each backup run.
                    </p>
                </div>
                <div class="uk-flex uk-flex-right uk-margin-top">
                    <button type="submit" class="uk-button kp-btn-primary">
                        <span uk-icon="check"></span> Save
                    </button>
                </div>
            </form>
        </div>

        <!-- S3 backup storage -->
        <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">S3 Backup Storage</h3>
            <form id="s3-form" class="uk-form-stacked">
                <div class="uk-margin">
                    <label class="kp-label" for="s3-endpoint">Endpoint URL</label>
                    <input
                        class="uk-input kp-input kp-mono"
                        id="s3-endpoint"
                        name="s3_endpoint"
                        type="url"
                        placeholder="https://s3.amazonaws.com"
                        value="${s.s3_endpoint??""}">
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        AWS S3 or any S3-compatible endpoint (Backblaze B2, MinIO, Wasabi, etc.)
                    </p>
                </div>
                <div class="uk-margin">
                    <label class="kp-label" for="s3-bucket">Bucket</label>
                    <input
                        class="uk-input kp-input kp-mono"
                        id="s3-bucket"
                        name="s3_bucket"
                        type="text"
                        placeholder="my-podnest-backups"
                        value="${s.s3_bucket??""}">
                </div>
                <div class="uk-margin">
                    <label class="kp-label" for="s3-region">Region</label>
                    <input
                        class="uk-input kp-input kp-mono"
                        id="s3-region"
                        name="s3_region"
                        type="text"
                        placeholder="us-east-1"
                        value="${s.s3_region??""}">
                </div>
                <div class="uk-margin">
                    <label class="kp-label" for="s3-access-key">Access Key ID</label>
                    <input
                        class="uk-input kp-input kp-mono"
                        id="s3-access-key"
                        name="s3_access_key"
                        type="text"
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        value="${s.s3_access_key??""}">
                </div>
                <div class="uk-margin">
                    <label class="kp-label" for="s3-secret-key">Secret Access Key</label>
                    <input
                        class="uk-input kp-input kp-mono"
                        id="s3-secret-key"
                        name="s3_secret_key"
                        type="password"
                        placeholder="${s.s3_secret_key?"saved \u2014 enter new value to change":"enter secret key"}"
                        value="">
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Leave blank to keep the existing key.
                    </p>
                </div>
                <div class="uk-flex uk-flex-right uk-margin-top">
                    <button type="submit" class="uk-button kp-btn-primary">
                        <span uk-icon="check"></span> Save
                    </button>
                </div>
            </form>
        </div>
        `,t.admin_domain&&J(t.admin_domain),document.getElementById("settings-form").addEventListener("submit",async n=>{n.preventDefault();let a=n.target.querySelector('[type="submit"]'),i=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let c={admin_domain:new FormData(n.target).get("admin_domain").trim()};try{await d.put("/settings",c),o.success("Settings saved"),J(c.admin_domain)}catch(r){o.error(r.message)}finally{a.disabled=!1,a.innerHTML=i}}),document.getElementById("settings-import-file").addEventListener("change",async n=>{let a=n.target.files[0];if(!a)return;let i=new FormData;i.append("file",a);try{let l=await fetch("/api/settings/import",{method:"POST",body:i}),c=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(c?.error||`HTTP ${l.status}`);o.success("Settings imported \u2014 reloading"),F(e)}catch(l){o.error(l.message)}finally{n.target.value=""}}),document.getElementById("backup-form").addEventListener("submit",async n=>{n.preventDefault();let a=n.target.querySelector('[type="submit"]'),i=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let l=new FormData(n.target),c={backup_schedule:l.get("backup_schedule").trim(),backup_retain_days:l.get("backup_retain_days").trim()};try{await d.put("/settings/backup",c),o.success("Backup settings saved")}catch(r){o.error(r.message)}finally{a.disabled=!1,a.innerHTML=i}}),document.getElementById("s3-form").addEventListener("submit",async n=>{n.preventDefault();let a=n.target.querySelector('[type="submit"]'),i=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let l=new FormData(n.target),c={s3_endpoint:l.get("s3_endpoint").trim(),s3_bucket:l.get("s3_bucket").trim(),s3_region:l.get("s3_region").trim(),s3_access_key:l.get("s3_access_key").trim()},r=l.get("s3_secret_key").trim();r&&(c.s3_secret_key=r);try{await d.put("/settings/backup",c),o.success("S3 settings saved")}catch(p){o.error(p.message)}finally{a.disabled=!1,a.innerHTML=i}})}function X(e){return`
        <div id="backups-panel" data-site-id="${e}">

            <!-- repo config card -->
            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Backup Destinations</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="backup-repo-save" uk-tooltip="Save Your Backup Configuration">
                        <span uk-icon="check"></span>
                    </button>
                </div>
                <div class="uk-flex" style="gap:24px;flex-wrap:wrap" id="backup-repo-toggles">
                    <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                        <input type="checkbox" class="uk-checkbox" id="backup-local-enabled">
                        <span class="kp-text">Local</span>
                    </label>
                    <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                        <input type="checkbox" class="uk-checkbox" id="backup-s3-enabled">
                        <span class="kp-text">S3</span>
                    </label>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    Local backups are stored under the site's SFTP home directory and are accessible
                    over SFTP as <span class="kp-mono">backups/local/</span>. S3 requires global S3
                    credentials to be configured under Settings.
                </p>
            </div>

            <!-- backup list card -->
            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Snapshots</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="backup-run-btn" uk-tooltip="Run a Manual Backup">
                        <span uk-icon="cloud-upload"></span>
                    </button>
                </div>
                <div id="backup-error-banner"></div>
                <div id="backup-list-wrap">
                    <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
                </div>
            </div>

        </div>`}function fe(e){if(!e||e.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>';let t=a=>a===2?'<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>':'<span class="kp-mono" style="color:var(--kp-blue)">Local</span>',s=a=>a<1024?`${a} B`:a<1048576?`${(a/1024).toFixed(1)} KB`:a<1073741824?`${(a/1048576).toFixed(1)} MB`:`${(a/1073741824).toFixed(2)} GB`;return`
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead>
                <tr>
                    <th>Snapshot ID</th>
                    <th>Label</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Created</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${e.map(a=>`
        <tr>
            <td class="kp-mono" style="font-size:0.8rem">${a.SnapshotID}</td>
            <td>${a.Label||"\u2014"}</td>
            <td>${t(a.BackupType)}</td>
            <td>${s(a.SizeBytes)}</td>
            <td>${new Date(a.Created).toLocaleString()}</td>
            <td>
                <div class="uk-flex" style="gap:6px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm backup-download-btn"
                        data-id="${a.ID}" uk-tooltip="Download backup archive">
                        <span uk-icon="download"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm backup-restore-btn"
                        data-id="${a.ID}" uk-tooltip="Restore from this snapshot">
                        <span uk-icon="history"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm backup-delete-btn"
                        data-id="${a.ID}" uk-tooltip="Delete this snapshot">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("")}</tbody>
        </table>`}async function B(e,t){try{let[s,n]=await Promise.all([d.get(`/sites/${t}/backup-repo`),d.get(`/sites/${t}/backups`)]),a=e.querySelector("#backup-local-enabled"),i=e.querySelector("#backup-s3-enabled");a&&(a.checked=!!s.LocalEnabled),i&&(i.checked=!!s.S3Enabled);let l=e.querySelector("#backup-error-banner");if(l)if(s.last_error){let r=s.last_error_at?` (${new Date(s.last_error_at).toLocaleString()})`:"";l.innerHTML=`
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${r}:</strong> ${s.last_error}</p>
                    </div>`}else l.innerHTML="";let c=e.querySelector("#backup-list-wrap");c&&(c.innerHTML=fe(n))}catch(s){let n=e.querySelector("#backup-list-wrap");n&&(n.innerHTML=`<p class="kp-muted uk-text-small">Failed to load backups: ${s.message}</p>`)}}function Z(e,t){e.querySelector("#backup-repo-save")?.addEventListener("click",async()=>{let s={local_enabled:e.querySelector("#backup-local-enabled")?.checked??!1,s3_enabled:e.querySelector("#backup-s3-enabled")?.checked??!1};try{await d.put(`/sites/${t}/backup-repo`,s),o.success("Backup destinations saved")}catch(n){o.error(n.message)}}),e.querySelector("#backup-run-btn")?.addEventListener("click",async()=>{let s=0;try{s=(await d.get(`/sites/${t}/backups`))?.length??0}catch{}try{await d.post(`/sites/${t}/backups`,{label:"manual"})}catch(i){o.error(i.message);return}y("Backup Running","Snapshotting files and database \u2014 this may take a few minutes.");let n=Date.now()+10*60*1e3,a=setInterval(async()=>{try{(((await d.get(`/sites/${t}/backups`))?.length??0)>s||Date.now()>n)&&(clearInterval(a),f(),await B(e,t),Date.now()<=n&&o.success("Backup complete"))}catch{}},4e3)}),e.querySelector("#backup-list-wrap")?.addEventListener("click",async s=>{let n=s.target.closest(".backup-restore-btn");if(n){let l=n.dataset.id;if(!await w("Restore Site","This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"))return;try{await d.post(`/sites/${t}/backups/${l}/restore`)}catch(g){o.error(g.message);return}y("Restore Running","Restoring files and database \u2014 the site will return automatically when complete.");let r=Date.now(),p=Date.now()+15*60*1e3,m=setInterval(async()=>{try{let g=await d.get(`/sites/${t}/backups/restore-status`);(!g?.active||Date.now()>p)&&(clearInterval(m),f(),g?.active?o.error("Restore timed out"):o.success("Restore complete"),await B(e,t))}catch{}},3e3);return}let a=s.target.closest(".backup-delete-btn");if(a){let l=a.dataset.id;if(!await w("Delete Snapshot","This will permanently remove the snapshot from all configured repositories. This cannot be undone."))return;y("Deleting Snapshot","Removing snapshot data from repositories \u2014 this may take a moment.");try{await d.delete(`/sites/${t}/backups/${l}`),f(),o.success("Snapshot deleted"),await B(e,t)}catch(r){f(),o.error(r.message)}}let i=s.target.closest(".backup-download-btn");if(i){let l=i.dataset.id;y("Preparing Download","Your backup archive is being generated \u2014 this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."),setTimeout(()=>{let c=document.createElement("a");c.href=`/api/sites/${t}/backups/${l}/download`,c.style.display="none",document.body.appendChild(c),c.click(),document.body.removeChild(c),setTimeout(()=>{f()},5e3)},300);return}})}var A={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis",5:"Varnish"};function C(e,t,s){let n=s?Object.entries(s):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <span class="kp-muted uk-text-small">${n.length} configuration keys</span>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="${t}" uk-tooltip="Add a Key">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="${t}" data-site="${e}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="${t}" data-site="${e}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/sites/${e}/configs/${t}/export" download="${e}-config-${t}.csv" uk-tooltip="Export config as CSV">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="${t}" data-site="${e}" uk-tooltip="Import config from CSV" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".csv" style="display:none" data-type="${t}" data-site="${e}">
                    </label>
                </div>
            </div>
            <div class="kp-config-grid cfg-rows" data-type="${t}">
                ${n.map(([a,i])=>I(a,i)).join("")}
            </div>
        </div>`}function ee(e,t){let s=t?.enabled==="true",n=t?Object.entries(t).filter(([a])=>a!=="enabled"):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom" uk-tooltip="Add a Key">
                <span class="kp-muted uk-text-small">${n.length} configuration keys</span>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="5">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="5" data-site="${e}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="5" data-site="${e}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/sites/${e}/configs/5/export" download="${e}-config-5.csv" uk-tooltip="Export config as CSV">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="5" data-site="${e}" uk-tooltip="Import config from CSV" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".csv" style="display:none" data-type="5" data-site="${e}">
                    </label>
                </div>
            </div>

            <!-- enable/disable toggle \u2014 requires pod recreate to take effect -->
            <div class="uk-margin-small-bottom" style="background:var(--kp-surface-2);padding:10px 12px;border-radius:6px">
                <label class="uk-flex uk-flex-middle" style="gap:10px;cursor:pointer">
                    <input type="checkbox" class="uk-checkbox varnish-enabled-toggle" ${s?"checked":""}>
                    <span>Enable Varnish Cache</span>
                    <span class="kp-muted uk-text-small">\u2014 requires pod recreate to take effect</span>
                </label>
            </div>

            <div class="kp-config-grid cfg-rows" data-type="5">
                ${n.map(([a,i])=>I(a,i)).join("")}
            </div>
        </div>`}function I(e="",t=""){return`<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${e}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${t}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function te(e,t){e.addEventListener("click",s=>{if(s.target.closest(".cfg-add-row")){let n=s.target.closest(".cfg-add-row");e.querySelector(`.cfg-rows[data-type="${n.dataset.type}"]`).insertAdjacentHTML("beforeend",I())}}),e.addEventListener("click",s=>{s.target.closest(".cfg-del-row")&&s.target.closest(".kp-config-row").remove()}),e.addEventListener("click",async s=>{let n=s.target.closest(".cfg-save");if(!n)return;let{type:a,site:i}=n.dataset,l=e.querySelectorAll(`.cfg-rows[data-type="${a}"] .kp-config-row`),c={};if(l.forEach(r=>{let p=r.querySelector(".cfg-key").value.trim(),m=r.querySelector(".cfg-val").value.trim();p&&(c[p]=m)}),a==="5"){let r=e.querySelector(".varnish-enabled-toggle");c.enabled=r?.checked?"true":"false"}try{await d.put(`/sites/${i}/configs/${a}`,c),o.success(`${A[a]} config saved`)}catch(r){o.error(r.message)}}),e.addEventListener("click",async s=>{let n=s.target.closest(".cfg-reset");if(!n)return;let{type:a,site:i}=n.dataset;if(await w("Reset Config",`Reset ${A[a]} config to defaults?`))try{let c=await d.post(`/sites/${i}/configs/${a}/reset`),r=e.querySelector(`.cfg-rows[data-type="${a}"]`);r.innerHTML=Object.entries(c).map(([p,m])=>I(p,m)).join(""),o.success(`${A[a]} reset to defaults`)}catch(c){o.error(c.message)}}),e.addEventListener("change",async s=>{let n=s.target.closest(".cfg-import-input");if(!n)return;let{type:a,site:i}=n.dataset,l=n.files[0];if(!l)return;let c=new FormData;c.append("file",l);try{let r=await fetch(`/api/sites/${i}/configs/${a}/import`,{method:"POST",body:c}),p=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(p?.error||`HTTP ${r.status}`);let m=e.querySelector(`.cfg-rows[data-type="${a}"]`);m.innerHTML=Object.entries(p).map(([g,k])=>I(g,k)).join(""),o.success(`${A[a]} config imported`)}catch(r){o.error(r.message)}finally{n.value=""}})}function se(e,t){return`
        <div>
            <div class="kp-log-controls">
                <select class="uk-select kp-select" id="log-container" style="width:140px;height:38px">
                    <option value="nginx">Nginx</option>
                    ${(()=>{switch(t){case 1:case 2:return'<option value="php">PHP-FPM</option>';case 4:return'<option value="app">Node.js</option>';case 5:return'<option value="app">.NET</option>';default:return""}})()}
                    <option value="db">MariaDB</option>
                    <option value="redis">Redis</option>
                </select>
                <select class="uk-select kp-select" id="log-tail" style="width:120px;height:38px">
                    <option value="100">100 lines</option>
                    <option value="250">250 lines</option>
                    <option value="500">500 lines</option>
                    <option value="1000">1000 lines</option>
                </select>
                <button class="uk-button kp-btn-secondary kp-btn-sm" id="log-connect" uk-tooltip="Start Tailing the Logs">
                    <span uk-icon="play"></span>
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="log-disconnect" disabled uk-tooltip="Stop Tailing the Logs">
                    <span uk-icon="ban"></span>
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="log-clear" uk-tooltip="Clear the Logs">
                    <span uk-icon="trash"></span>
                </button>
                <label style="font-size:0.82rem;color:var(--kp-text-dim);display:flex;align-items:center;gap:6px">
                    <input type="checkbox" class="uk-checkbox" id="log-autoscroll" checked>
                    Auto-scroll
                </label>
            </div>
            <div class="kp-log-header">
                <div class="kp-log-dot kp-log-dot-red"></div>
                <div class="kp-log-dot kp-log-dot-yellow"></div>
                <div class="kp-log-dot kp-log-dot-green"></div>
                <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px" id="log-status">Disconnected</span>
            </div>
            <div class="kp-log-wrap" id="log-output"></div>
        </div>`}function ae(e,t){let s=null,n=!1,a=e.querySelector("#log-output"),i=e.querySelector("#log-connect"),l=e.querySelector("#log-disconnect"),c=e.querySelector("#log-clear"),r=e.querySelector("#log-autoscroll"),p=e.querySelector("#log-status");function m(v){v.split(`
`).forEach(b=>{if(!b)return;let h=document.createElement("div");h.className=b.match(/error|crit|emerg/i)?"kp-log-line-err":b.match(/warn/i)?"kp-log-line-warn":b.match(/info|notice/i)?"kp-log-line-info":"",h.textContent=b,a.appendChild(h)}),r.checked&&(a.scrollTop=a.scrollHeight)}function g(){s&&(s.close(),s=null),n=!1,i.disabled=!1,l.disabled=!0,p&&(p.textContent="Disconnected")}i.addEventListener("click",()=>{g();let v=e.querySelector("#log-container").value,b=e.querySelector("#log-tail").value,h=location.protocol==="https:"?"wss":"ws";s=new WebSocket(`${h}://${location.host}/api/sites/${t}/logs?container=${v}&tail=${b}`),s.onopen=()=>{n=!0,i.disabled=!0,l.disabled=!1,p&&(p.textContent=`Connected \u2014 ${v}`)},s.onmessage=x=>m(x.data),s.onerror=()=>{},s.onclose=()=>{n=!1,i.disabled=!1,l.disabled=!0,p&&(p.textContent="Disconnected")}}),l.addEventListener("click",g),c.addEventListener("click",()=>{a.innerHTML=""}),e.querySelector("#log-container").addEventListener("change",()=>{s&&s.readyState===WebSocket.OPEN&&(g(),i.click())});let k=u.go.bind(u);u.go=function(v,b={}){return s&&g(),k(v,b)}}function ye(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function ne(e,t){try{let s=await d.get(`/ssl-status?domain=${encodeURIComponent(e)}`),n=document.getElementById(`ssl-icon-${t}`);n&&(n.outerHTML=ye(s.status))}catch{}}function ie(e){e.forEach(t=>ne(t.Domain,t.ID))}function oe(e,t,s){let n=e.SiteType!==3&&e.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${e.Name}</td></tr>
                            <tr><td class="kp-muted">Internal Port</td><td>:${e.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${_(e.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${P(e)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${$(e.SiteStatus)}</td></tr>
                            <tr><td class="kp-muted">Created</td><td>${new Date(e.Created).toLocaleString()}</td></tr>
                        </tbody>
                    </table>
                </div>

                ${n?`
                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">phpMyAdmin</h3>
                    <p class="kp-muted uk-text-small uk-margin-remove-bottom">
                        Opens a secure time-limited session. Link expires after 10 minutes or first use.
                    </p>
                    <div class="uk-margin-small-top">
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="pma-open-btn">
                            <span uk-icon="database"></span> Open phpMyAdmin
                        </button>
                    </div>
                </div>`:""}
            </div>

            <div class="uk-width-1-2@m">

                <div class="kp-card uk-padding-small">
                    <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                        <h3 class="kp-view-title uk-margin-bottom">Domains</h3>
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="domain-add-btn" uk-tooltip="Add a New Domain">
                            <span uk-icon="plus"></span>
                        </button>
                    </div>
                    <div id="domain-list">
                        ${t.length?t.map(le).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
                    </div>
                    <div id="domain-add-form" class="uk-hidden uk-margin-small-top">
                        <div class="uk-flex kp-domain-add-wrap">
                            <input class="uk-input kp-input kp-input-sm" id="domain-add-input" type="text" placeholder="example.com">
                            <button class="uk-button kp-btn-primary kp-btn-sm" id="domain-save-btn">Add</button>
                            <button class="uk-button kp-btn-ghost kp-btn-sm" id="domain-cancel-btn">Cancel</button>
                        </div>
                    </div>
                </div>

                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">SFTP Access</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Host</td><td class="kp-mono">${location.hostname}</td></tr>
                            <tr><td class="kp-muted">Port</td><td class="kp-mono">2222</td></tr>
                            <tr><td class="kp-muted">User</td><td class="kp-mono">${s?.Username??e.Name}</td></tr>
                            <tr>
                                <td class="kp-muted">Password</td>
                                <td>
                                    <span id="sftp-pass-display" class="kp-mono kp-sftp-pass">${s?.Password??"\u2014"}</span>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left" id="sftp-copy-btn" uk-tooltip="Copy the Password">
                                        <span uk-icon="icon: copy; ratio: 0.75"></span>
                                    </button>
                                </td>
                            </tr>
                            <tr><td class="kp-muted">Path</td><td class="kp-mono">/html</td></tr>
                        </tbody>
                    </table>
                    <div class="uk-margin-small-top">
                        <button class="uk-button kp-btn-ghost kp-btn-sm" id="sftp-regen-btn">
                            <span uk-icon="refresh"></span> Regenerate Password
                        </button>
                    </div>
                </div>

            </div>
        </div>`}function le(e){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${e.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${e.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <span class="uk-text-small kp-mono">${e.Domain}</span>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${e.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function re(e,t){e.querySelector("#domain-add-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.remove("uk-hidden")}),e.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.add("uk-hidden")}),e.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#domain-add-input").value.trim();if(s)try{let n=await d.post(`/sites/${t}/domains`,{domain:s});e.querySelector("#domain-list").insertAdjacentHTML("beforeend",le(n)),ne(n.Domain,n.ID),e.querySelector("#domain-add-form").classList.add("uk-hidden"),e.querySelector("#domain-add-input").value="",o.success("Domain added")}catch(n){o.error(n.message)}}),e.querySelector("#domain-list")?.addEventListener("click",async s=>{let n=s.target.closest('[data-action="delete-domain"]');if(!(!n||!await w("Remove Domain","Remove this domain from the site?")))try{await d.delete(`/sites/${t}/domains/${n.dataset.did}`),n.closest("[data-domain-id]").remove(),o.success("Domain removed")}catch(i){o.error(i.message)}})}function ce(e,t){e.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#sftp-regen-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.post(`/sites/${t}/sftp-regen`),o.success("SFTP password regenerated"),u.go("site-detail",{id:String(t)})}catch(a){o.error(a.message),s.disabled=!1,s.innerHTML=n}}),e.querySelector("#sftp-copy-btn")?.addEventListener("click",()=>{let s=e.querySelector("#sftp-pass-display")?.textContent;if(s)if(navigator.clipboard)navigator.clipboard.writeText(s).then(()=>o.success("Password copied to clipboard")).catch(()=>o.error("Failed to copy password"));else{let n=document.createElement("textarea");n.value=s,n.style.cssText="position:fixed;opacity:0",document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n),o.success("Password copied to clipboard")}}),e.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#pma-open-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let a=await d.post(`/sites/${t}/pma-token`);window.open(a.url,"_blank")}catch(a){o.error(a.message)}finally{s.disabled=!1,s.innerHTML=n}})}var we=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function de(e){return`
        <div>
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${we.map(t=>`
                   <button class="uk-button kp-btn-ghost kp-btn-sm"
                        data-action="wpcli-quick"
                        data-cmd="${t.cmd}">
                        ${t.label}
                    </button>`).join("")}
            </div>
            
            <p class="kp-muted uk-text-small uk-margin-small-top">
                <span uk-icon="icon: info; ratio: 0.75"></span>
                WP-CLI <span class="kp-mono">db</span> subcommands are not available for security.
            </p>

            <div class="uk-flex uk-flex-middle uk-margin-small-top" style="gap:8px">
                <span class="kp-mono" style="color:var(--kp-cyan);font-size:0.85rem;flex-shrink:0">wp&gt;</span>
                <input
                    class="uk-input kp-input"
                    id="wpcli-input"
                    type="text"
                    placeholder="plugin list --status=active"
                    style="height:38px;font-family:'JetBrains Mono',monospace;font-size:0.85rem"
                    autocomplete="off"
                    spellcheck="false">
                <button class="uk-button kp-btn-primary kp-btn-sm" id="wpcli-run">
                    <span uk-icon="play"></span> Run
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="wpcli-clear">
                    <span uk-icon="trash"></span> Clear
                </button>
            </div>

            <div class="kp-log-header uk-margin-small-top">
                <div class="kp-log-dot kp-log-dot-red"></div>
                <div class="kp-log-dot kp-log-dot-yellow"></div>
                <div class="kp-log-dot kp-log-dot-green"></div>
                <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px" id="wpcli-status">Ready</span>
            </div>
            <div class="kp-log-wrap" id="wpcli-output" style="height:500px"></div>
        </div>`}function pe(e,t){let s=e.querySelector("#wpcli-output"),n=e.querySelector("#wpcli-input"),a=e.querySelector("#wpcli-run"),i=e.querySelector("#wpcli-clear"),l=e.querySelector("#wpcli-status"),c=[],r=-1;function p(k,v=""){k.split(`
`).forEach(b=>{if(!b)return;let h=document.createElement("div");v?h.className=v:h.className=b.match(/error|fatal|critical/i)?"kp-log-line-err":b.match(/warning|warn/i)?"kp-log-line-warn":b.match(/success|done\]/i)?"kp-log-line-info":"",h.textContent=b,s.appendChild(h)}),s.scrollTop=s.scrollHeight}function m(k){if(k=k.trim(),!k)return;c.unshift(k),r=-1,p(`wp> ${k}`,"kp-log-line-info"),n.disabled=!0,a.disabled=!0,l&&(l.textContent="Running...");let v=location.protocol==="https:"?"wss":"ws",b=new WebSocket(`${v}://${location.host}/api/sites/${t}/wpcli`);b.onopen=()=>{b.send(JSON.stringify({command:k}))},b.onmessage=h=>{let x=h.data;if(x.trim()==="[done]"){b.close();return}if(x.startsWith("[info]")){p(x,"kp-muted");return}if(x.startsWith("[error]")){p(x,"kp-log-line-err");return}p(x)},b.onerror=()=>{p("[error] WebSocket connection failed","kp-log-line-err")},b.onclose=()=>{n.disabled=!1,a.disabled=!1,l&&(l.textContent="Ready"),n.focus()}}a.addEventListener("click",()=>{m(n.value),n.value=""}),n.addEventListener("keydown",k=>{if(k.key==="Enter"){m(n.value),n.value="",r=-1;return}if(k.key==="ArrowUp"){k.preventDefault(),r<c.length-1&&(r++,n.value=c[r]);return}k.key==="ArrowDown"&&(k.preventDefault(),r>0?(r--,n.value=c[r]):(r=-1,n.value=""))}),e.querySelectorAll('[data-action="wpcli-quick"]').forEach(k=>{k.addEventListener("click",()=>{let v=k.dataset.cmd;if(v.startsWith("search-replace")){n.value=v,n.focus();let b=v.indexOf("''")+1;n.setSelectionRange(b,b);return}m(v)})}),i.addEventListener("click",()=>{s.innerHTML=""});let g=u.go.bind(u);u.go=function(k,v={}){return g(k,v)},n.focus()}async function ue(e,{id:t}){let[{site:s,domains:n,sftp:a},i,l]=await Promise.all([d.get(`/sites/${t}`),d.get("/sites"),d.get(`/sites/${t}/configs`)]),c=s.SiteType===1||s.SiteType===2;e.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <select id="sd-site-nav" class="uk-select kp-select" style="width:auto;height:38px;font-size:1rem;font-weight:700;color:var(--kp-white)">
                    ${i.map(r=>`<option value="${r.ID}" ${r.ID===s.ID?"selected":""}>${r.Name}</option>`).join("")}
                </select>
                ${$(s.SiteStatus)}
            </div>
            <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="start" data-id="${t}" uk-tooltip="Start the Site"><span uk-icon="play"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="stop" data-id="${t}" uk-tooltip="Stop the Site"><span uk-icon="ban"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="restart" data-id="${t}" uk-tooltip="Restart the Site"><span uk-icon="refresh"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="flush" data-id="${t}" uk-tooltip="Flush the Caches"><span uk-icon="bolt"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="update" data-id="${t}" uk-tooltip="Update the Pod Images"><span uk-icon="cloud-upload"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-recreate" uk-tooltip="Recreate the Pod"><span uk-icon="history"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-edit" uk-tooltip="Edit the Site"><span uk-icon="pencil"></span></button>
            </div>
        </div>

        <ul uk-tab class="uk-margin-medium-bottom">
            <li><a href="#">Overview</a></li>
            <li><a href="#">Nginx</a></li>
            ${c?'<li><a href="#">PHP</a></li>':""}
            <li><a href="#">MariaDB</a></li>
            <li><a href="#">Redis</a></li>
            <li><a href="#">Varnish</a></li>
            <li><a href="#">Logs</a></li>
            <li><a href="#">Security</a></li>
            ${s.SiteType===1?'<li><a href="#">WP-CLI</a></li>':""}
            <li><a href="#">Backups</a></li>
        </ul>

        <ul class="uk-switcher">
            <li>${oe(s,n??[],a)}</li>
            <li>${C(t,1,l[1])}</li>
            ${c?`<li>${C(t,2,l[2])}</li>`:""}
            <li>${C(t,3,l[3])}</li>
            <li>${C(t,4,l[4])}</li>
            <li>${ee(t,l[5])}</li>
            <li>${se(t,s.SiteType)}</li>
            <li>${R(t)}</li>
            ${s.SiteType===1?`<li>${de(t)}</li>`:""}            
            <li>${X(t)}</li>
        </ul>`,document.getElementById("sd-back").addEventListener("click",()=>u.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>q(s)),document.getElementById("sd-recreate").addEventListener("click",async()=>{y("Recreating Pod","Recreating containers for this site...");try{await d.post(`/sites/${t}/recreate`),f(),o.success("Pod recreated"),u.go("site-detail",{id:t})}catch(r){f(),o.error(r.message)}}),document.getElementById("sd-site-nav")?.addEventListener("change",r=>{u.go("site-detail",{id:r.target.value})}),e.querySelectorAll("[data-action]").forEach(r=>{r.addEventListener("click",async()=>{let p=r.dataset.action;if(p==="flush"){try{await d.post(`/sites/${t}/flush`),o.success("Caches flushed")}catch(g){o.error(g.message)}return}y(`${{start:"Starting",stop:"Stopping",restart:"Restarting",update:"Updating"}[p]??p} Pod`,"Please wait...");try{await d.post(`/sites/${t}/${p}`),f(),o.success(`Site ${p} successful`),u.go("site-detail",{id:t})}catch(g){f(),o.error(g.message)}})}),te(e,t),re(e,t),ae(e,t),N(e),s.SiteType===1&&pe(e,t),L(e),ce(e,t),Z(e,t),B(e,t),ie(n??[])}async function U(e){let t=document.getElementById("totp-qr-img"),s=document.getElementById("totp-qr-wrap");if(!t||!s)return;if(s.querySelectorAll(".totp-uri-text").forEach(a=>a.remove()),typeof QRCode<"u")try{let a=await new Promise((i,l)=>{QRCode.toDataURL(e,{width:220,margin:2},(c,r)=>{c?l(c):i(r)})});t.src=a,t.style.display="";return}catch{}let n=document.createElement("p");n.className="totp-uri-text kp-muted uk-text-small",n.style.wordBreak="break-all",n.textContent=e,s.appendChild(n)}function V(e){document.getElementById("kp-backup-codes-modal")?.remove();let s=`
        <div id="kp-backup-codes-modal" uk-modal="bg-close:false;esc-close:false">
            <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:480px">
                <h3 class="uk-modal-title" style="color:var(--kp-yellow,#f0b429)">
                    <span uk-icon="warning"></span>&nbsp;Save Your Backup Codes
                </h3>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    These codes let you access your account if you lose your authenticator.
                    Each code works <strong>once only</strong>. Keep them somewhere safe.
                </p>
                <div class="kp-backup-codes-grid uk-margin-small">${e.map(a=>`<code class="kp-backup-code">${a}</code>`).join("")}</div>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    These codes will <strong>not</strong> be shown again.
                </p>
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button id="kp-backup-copy-btn" class="uk-button kp-btn-ghost">Copy All</button>
                    <button id="kp-backup-done-btn" class="uk-button kp-btn-primary">I've Saved These</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",s);let n=UIkit.modal("#kp-backup-codes-modal");n.show(),document.getElementById("kp-backup-copy-btn").addEventListener("click",()=>{let a=e.join(`
`),i=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(a).then(()=>{i.textContent="Copied!"});else{let l=document.createElement("textarea");l.value=a,l.style.cssText="position:fixed;opacity:0",document.body.appendChild(l),l.select();try{document.execCommand("copy"),i.textContent="Copied!"}catch{}l.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{n.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),u.go("users")})}function me(e){document.body.insertAdjacentHTML("beforeend",`
        <div id="kp-create-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">New User</h3>
                <form id="create-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" required>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel">
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Password</label>
                            <input class="uk-input kp-input" name="password" type="password" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Role</label>
                            <select class="uk-select kp-select" name="role">
                                <option value="50">Manager</option>
                                <option value="99">Admin</option>
                            </select>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Create User</button>
                    </div>
                </form>

                <div id="cu-totp-section" style="display:none">
                    <hr class="uk-divider-muted uk-margin-top">
                    <h4 class="uk-margin-small-bottom kp-view-title">Two-Factor Authentication</h4>
                    <div class="uk-flex uk-flex-middle" style="gap:12px">
                        <span class="kp-badge kp-badge-manager" style="font-size:0.75rem">Disabled</span>
                        <button id="cu-totp-setup-btn" class="uk-button kp-btn-primary kp-btn-sm">Enable TOTP</button>
                    </div>
                    <div id="totp-setup-area" style="display:none" class="uk-margin-top">
                        <p class="kp-muted uk-text-small">Scan the QR code with your authenticator app, then enter the 6-digit code to activate.</p>
                        <div class="uk-text-center uk-margin-small" id="totp-qr-wrap">
                            <img id="totp-qr-img" style="display:none;width:220px;height:220px;border-radius:6px" alt="TOTP QR Code">
                        </div>
                        <p class="kp-muted uk-text-small uk-text-center uk-margin-remove-top">
                            Manual key: <code id="totp-secret-text" style="word-break:break-all"></code>
                        </p>
                        <div class="uk-flex" style="gap:8px;margin-top:8px">
                            <input class="uk-input kp-input" id="totp-confirm-code" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="letter-spacing:0.2em">
                            <button id="cu-totp-confirm-btn" class="uk-button kp-btn-primary" style="white-space:nowrap">Confirm &amp; Enable</button>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button id="cu-totp-skip-btn" class="uk-button kp-btn-ghost">Skip for now</button>
                    </div>
                </div>
            </div>
        </div>`);let s=UIkit.modal("#kp-create-user-modal");s.show(),document.getElementById("create-user-form").addEventListener("submit",async n=>{n.preventDefault();let a=n.target.querySelector('[type="submit"]'),i=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let l=new FormData(n.target),c={fname:l.get("fname").trim(),lname:l.get("lname").trim(),uname:l.get("uname").trim(),email:l.get("email").trim(),phone:l.get("phone").trim(),password:l.get("password"),role:parseInt(l.get("role"))};try{let r=T(await d.post("/users",c));document.getElementById("users-table-body").insertAdjacentHTML("beforeend",z(r)),o.success(`User '${r.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",xe(r.id,s)}catch(r){o.error(r.message),a.disabled=!1,a.innerHTML=i}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function xe(e,t){let s=()=>{t.hide(),document.getElementById("kp-create-user-modal")?.remove(),u.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",s),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let n=document.getElementById("cu-totp-setup-btn");n.disabled=!0,n.textContent="Setting up\u2026";try{let a=await d.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=a.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await U(a.uri)}catch(a){o.error(a.message),n.disabled=!1,n.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let n=document.getElementById("totp-confirm-code").value.trim();if(n.length!==6){o.error("Enter a 6-digit code");return}let a=document.getElementById("cu-totp-confirm-btn");a.disabled=!0;try{let i=await d.post(`/users/${e}/totp/confirm`,{code:n});t.hide(),document.getElementById("kp-create-user-modal")?.remove(),o.success("TOTP enabled"),i.backup_codes?.length?V(i.backup_codes):u.go("users")}catch(i){o.error(i.message),a.disabled=!1}})}async function ke(e,t){document.getElementById("kp-edit-user-modal")?.remove();let s;try{s=T(await d.get(`/users/${t}`))}catch(p){o.error(p.message);return}let n=window.KP?.user?.role===99,a=`
        <div id="kp-edit-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit User \u2014 ${s.uname}</h3>
                <form id="edit-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        ${n?`
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" value="${s.uname}" autocomplete="off">
                        </div>`:""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" value="${s.fname}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" value="${s.lname}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" value="${s.email}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel" value="${s.phone||""}">
                        </div>
                        ${n?`
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Role</label>
                            <select class="uk-select kp-select" name="role">
                                <option value="50" ${s.role===50?"selected":""}>Manager</option>
                                <option value="99" ${s.role===99?"selected":""}>Admin</option>
                            </select>
                        </div>`:""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">New Password</label>
                            <input class="uk-input kp-input" name="password" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" uk-tooltip="leave blank to keep">
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Save Changes</button>
                    </div>
                </form>

                <hr class="uk-divider-muted uk-margin-top">

                <div id="totp-section">
                    <h4 class="uk-margin-small-bottom kp-view-title">Two-Factor Authentication</h4>
                    ${s.totp_enabled?`<div class="uk-flex uk-flex-middle" style="gap:12px">
                            <span class="kp-badge kp-badge-admin" style="font-size:0.75rem">Enabled</span>
                            <button id="totp-disable-btn" class="uk-button kp-btn-secondary kp-btn-sm">Disable TOTP</button>
                           </div>`:`<div class="uk-flex uk-flex-middle" style="gap:12px">
                            <span class="kp-badge kp-badge-manager" style="font-size:0.75rem">Disabled</span>
                            <button id="totp-setup-btn" class="uk-button kp-btn-primary kp-btn-sm">Enable TOTP</button>
                           </div>`}
                    <div id="totp-setup-area" style="display:none" class="uk-margin-top">
                        <p class="kp-muted uk-text-small">Scan the QR code with your authenticator app, then enter the 6-digit code to activate.</p>
                        <div class="uk-text-center uk-margin-small" id="totp-qr-wrap">
                            <img id="totp-qr-img" style="display:none;width:220px;height:220px;border-radius:6px" alt="TOTP QR Code">
                        </div>
                        <p class="kp-muted uk-text-small uk-text-center uk-margin-remove-top">
                            Manual key: <code id="totp-secret-text" style="word-break:break-all"></code>
                        </p>
                        <div class="uk-flex" style="gap:8px;margin-top:8px">
                            <input class="uk-input kp-input" id="totp-confirm-code" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="letter-spacing:0.2em">
                            <button id="totp-confirm-btn" class="uk-button kp-btn-primary" style="white-space:nowrap">Confirm &amp; Enable</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",a);let i=UIkit.modal("#kp-edit-user-modal");i.show(),document.getElementById("edit-user-form").addEventListener("submit",async p=>{p.preventDefault();let m=p.target.querySelector('[type="submit"]'),g=m.innerHTML;m.disabled=!0,m.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let k=new FormData(p.target),v={fname:k.get("fname").trim(),lname:k.get("lname").trim(),email:k.get("email").trim(),phone:k.get("phone").trim()};if(n){v.role=parseInt(k.get("role"));let h=k.get("uname");h&&(v.uname=h.trim())}let b=k.get("password");b&&(v.password=b);try{await d.put(`/users/${t}`,v),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),o.success("User updated"),u.go("users")}catch(h){o.error(h.message),m.disabled=!1,m.innerHTML=g}});let l=document.getElementById("totp-setup-btn");l&&l.addEventListener("click",async()=>{l.disabled=!0,l.textContent="Setting up\u2026";try{let p=await d.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=p.secret,document.getElementById("totp-setup-area").style.display="",await U(p.uri)}catch(p){o.error(p.message),l.disabled=!1,l.textContent="Enable TOTP"}});let c=document.getElementById("totp-confirm-btn");c&&c.addEventListener("click",async()=>{let p=document.getElementById("totp-confirm-code").value.trim();if(p.length!==6){o.error("Enter a 6-digit code");return}c.disabled=!0;try{let m=await d.post(`/users/${t}/totp/confirm`,{code:p});i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),o.success("TOTP enabled"),m.backup_codes?.length?V(m.backup_codes):u.go("users")}catch(m){o.error(m.message),c.disabled=!1}});let r=document.getElementById("totp-disable-btn");r&&r.addEventListener("click",async()=>{r.disabled=!0;try{await d.delete(`/users/${t}/totp`),o.success("TOTP disabled"),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),u.go("users")}catch(p){o.error(p.message),r.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove())}async function be(e){if(!E()){e.innerHTML=S("Access denied");return}let t=await d.get("/users");e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Users</h1>
            <button class="uk-button kp-btn-primary" id="users-new-btn">
                <span uk-icon="plus"></span> New User
            </button>
        </div>
        <div class="kp-table-wrap">
            <table class="uk-table uk-table-divider uk-table-middle uk-table-responsive uk-margin-remove">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th class="uk-text-center">2FA</th>
                        <th>Created</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="users-table-body">
                    ${t.map(s=>z(T(s))).join("")}
                </tbody>
            </table>
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>me(e)),Se(e)}function z(e){let t=e.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>';return`<tr data-user-id="${e.id}">
        <td><strong>${e.fname} ${e.lname}</strong></td>
        <td><span style="font-family:monospace">${e.uname}</span></td>
        <td>${e.email}</td>
        <td>${t}</td>
        <td class="uk-text-center">${e.totp_enabled?'<span uk-icon="icon: check; ratio: 0.9" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: close; ratio: 0.9" style="color:var(--kp-text-dim)"></span>'}</td>
        <td><span class="kp-muted">${e.created}</span></td>
        <td>
            <div class="uk-flex" style="gap:6px;justify-content:flex-end">
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit-user" data-uid="${e.id}" title="Edit" uk-tooltip="Edit the User">
                    <span uk-icon="icon: pencil;"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="delete-user" data-uid="${e.id}" title="Delete" uk-tooltip="Delete the User">
                    <span uk-icon="icon: trash;"></span>
                </button>
            </div>
        </td>
    </tr>`}function Se(e){e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="delete-user"]');if(!(!s||!await w("Delete User","Delete this user? This cannot be undone.")))try{await d.delete(`/users/${s.dataset.uid}`),s.closest("tr").remove(),o.success("User deleted")}catch(a){o.error(a.message)}}),e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="edit-user"]');s&&ke(e,s.dataset.uid)})}u.register("dashboard",e=>G(e));u.register("sites",e=>Q(e));u.register("site-detail",(e,t)=>ue(e,t));u.register("users",e=>be(e));u.register("settings",e=>F(e));u.register("security",e=>Y(e));document.addEventListener("click",e=>{let t=e.target.closest("[data-view]");if(!t)return;e.preventDefault(),u.go(t.dataset.view);let s=document.getElementById("kp-offcanvas");s&&UIkit.offcanvas(s).hide()});document.addEventListener("click",async e=>{let t=e.target.closest("[data-action]");if(!t)return;e.stopPropagation();let{action:s,id:n}=t.dataset;switch(s){case"manage":u.go("site-detail",{id:n});break;case"start":await D(n,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await D(n,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await D(n,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await D(n,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"edit":{let a=await d.get(`/sites/${n}`);q(a.site);break}case"delete":await $e(n);break;case"update":await D(n,"update","Updating Images","Pulling latest container images - this may take a few minutes...");break;case"recreate":y("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await d.post(`/sites/${n}/recreate`),f(),o.success("Pod recreated"),u.go("site-detail",{id:n})}catch(a){f(),o.error(a.message)}break}});async function D(e,t,s,n){y(s,n);try{await d.post(`/sites/${e}/${t}`),f(),o.success(s+" complete"),["start","stop","restart"].includes(t)&&u.go("sites")}catch(a){f(),o.error(a.message)}}async function $e(e){if(!await w("Delete Site","This will stop and permanently remove the pod and all its data. Are you sure?"))return;y("Deleting Site","Stopping containers and removing the pod - please wait...");try{await d.delete(`/sites/${e}`)}catch{}let s=!1,n=0;for(;!s&&n<10;){try{await new Promise(i=>setTimeout(i,2e3)),s=!(await d.get("/sites")).find(i=>i.ID===parseInt(e))}catch{}n++}f(),s?(o.success("Site deleted"),u.go("sites")):o.error("Delete failed - site still exists after 20s")}window.addEventListener("hashchange",()=>{let{view:e,params:t}=O();u.go(e,t)});var{view:Ee,params:Te}=O();u.go(Ee,Te);})();
