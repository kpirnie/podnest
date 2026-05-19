"use strict";(()=>{var d={async _req(e,t,s,n=6e4){let a=new AbortController,i=setTimeout(()=>a.abort(),n),o={method:e,headers:{"Content-Type":"application/json"},signal:a.signal};s!==void 0&&(o.body=JSON.stringify(s));try{let c=await fetch("/api"+t,o);clearTimeout(i);let l=c.status===204?null:await c.json().catch(()=>null);if(c.status===401)return window.location.href="/login?msg=Your+session+has+expired+%E2%80%94+please+log+in+again",null;if(!c.ok)throw new Error(l?.error||`HTTP ${c.status}`);return l}catch(c){throw clearTimeout(i),c}},get:e=>d._req("GET",e),post:(e,t)=>d._req("POST",e,t),put:(e,t)=>d._req("PUT",e,t),delete:e=>d._req("DELETE",e)};var K=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',S=e=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${e}</div>
    </div>`,D=(e,t)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${e}; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,E=e=>{let t={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[s,n]=t[e]||["stopped","Unknown"];return`<span class="kp-status kp-status-${s}">${n}</span>`},fe=e=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[e]||"?",M=e=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET"})[e]||"?",T=()=>window.KP.user.role===window.KP.roles.admin,P=e=>{switch(e.SiteType){case 1:case 2:return`PHP ${fe(e.PHPVersion)}`;case 4:return`Node ${{1:"20",2:"22",3:"23"}[e.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[e.RuntimeVersion]||"?"}`;default:return""}},L=e=>({id:e.id??e.ID,uname:e.uname??e.UName,uhash:e.uhash??e.UHash,fname:e.fname??e.FName,lname:e.lname??e.LName,email:e.email??e.Email,phone:e.phone??e.Phone,role:e.role??e.Role,totp_enabled:e.totp_enabled??!1,created:e.created??e.Created});function w(e,t){return new Promise(s=>{document.getElementById("kp-confirm-title").textContent=e,document.getElementById("kp-confirm-message").textContent=t;let n=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{n.hide(),s(!0)},{once:!0}),n.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>s(!1),{once:!0})})}function y(e,t){let s=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${e}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${t}</p>
                <p class="kp-muted">
                    This may take several minutes while images are pulled and containers are initialized.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",s),UIkit.modal("#kp-progress-modal").show()}function h(){let e=document.getElementById("kp-progress-modal");e&&(UIkit.modal(e).hide(),setTimeout(()=>e.remove(),300))}var k={routes:{},register(e,t){this.routes[e]=t},async go(e,t={}){let s=Object.keys(t).length?e+"/"+Object.values(t).join("/"):e;window.location.hash=s,document.querySelectorAll(".kp-nav-link").forEach(i=>{i.classList.toggle("kp-active",i.dataset.view===e)});let n=this.routes[e];if(!n)return;let a=document.getElementById("kp-view");a.innerHTML=K();try{await n(a,t)}catch(i){a.innerHTML=S(i.message)}}};function j(){let t=(window.location.hash.replace("#","")||"dashboard").split("/"),s=t[0],n={};return s==="site-detail"&&t[1]&&(n.id=t[1]),{view:s,params:n}}var r={show(e,t="info",s=7e3){let n={success:"check",error:"warning",info:"info"},a=document.createElement("div");a.className=`kp-toast kp-toast-${t}`,a.innerHTML=`<span uk-icon="${n[t]||"info"}"></span><span>${e}</span>`,document.getElementById("kp-toasts").appendChild(a),UIkit.icon(a.querySelector("[uk-icon]")),setTimeout(()=>a.remove(),s)},success:e=>r.show(e,"success"),error:e=>r.show(e,"error"),info:e=>r.show(e,"info")};async function H(e){let t=`
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
        </div>`;document.body.insertAdjacentHTML("beforeend",t);let s=UIkit.modal("#kp-edit-site-modal"),n=document.getElementById("es-site-type"),a=document.getElementById("es-php-version-wrap"),i=document.getElementById("es-node-version-wrap"),o=document.getElementById("es-dotnet-version-wrap"),c=document.getElementById("es-start-command-wrap"),l=document.getElementById("es-wordpress-wrap");s.show();let p=u=>{a.classList.toggle("uk-hidden",u!==1&&u!==2),i.classList.toggle("uk-hidden",u!==4),o.classList.toggle("uk-hidden",u!==5),c.classList.toggle("uk-hidden",u!==4&&u!==5),l.classList.toggle("uk-hidden",u!==1)};p(e.SiteType),n.addEventListener("change",()=>p(parseInt(n.value))),document.getElementById("edit-site-form").addEventListener("submit",async u=>{u.preventDefault();let g=u.target.querySelector('[type="submit"]'),b=g.innerHTML;g.disabled=!0,g.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let v=new FormData(u.target),m=parseInt(v.get("site_type")),f=null;m===4&&(f=parseInt(v.get("node_version"))),m===5&&(f=parseInt(v.get("dotnet_version")));let x={name:v.get("name").trim(),php_version:parseInt(v.get("php_version"))||3,site_type:m,runtime_version:f,start_command:v.get("start_command")?.trim()||""},W=m===1?v.get("install_wordpress")==="on":!1;try{await d.put(`/sites/${e.ID}`,x),s.hide(),document.getElementById("kp-edit-site-modal")?.remove(),y("Applying Changes","Saving changes and recreating pod...");try{await d.post(`/sites/${e.ID}/recreate`,{install_wordpress:W}),h(),r.success("Site updated and pod recreated")}catch(O){h(),r.error("Site saved but pod recreate failed: "+O.message)}k.go("site-detail",{id:String(e.ID)})}catch(O){r.error(O.message),g.disabled=!1,g.innerHTML=b}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}function _(){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let t=UIkit.modal("#kp-create-site-modal"),s=document.getElementById("cs-site-type"),n=document.getElementById("cs-php-version-wrap"),a=document.getElementById("cs-node-version-wrap"),i=document.getElementById("cs-dotnet-version-wrap"),o=document.getElementById("cs-start-command-wrap"),c=document.getElementById("cs-wordpress-wrap");t.show(),s.addEventListener("change",()=>{let l=parseInt(s.value);n.classList.toggle("uk-hidden",l!==1&&l!==2),a.classList.toggle("uk-hidden",l!==4),i.classList.toggle("uk-hidden",l!==5),o.classList.toggle("uk-hidden",l!==4&&l!==5),c.classList.toggle("uk-hidden",l!==1)}),document.getElementById("create-site-form").addEventListener("submit",async l=>{l.preventDefault();let p=l.target.querySelector('[type="submit"]'),u=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let g=new FormData(l.target),b=parseInt(g.get("site_type")),v=null;b===4&&(v=parseInt(g.get("node_version"))),b===5&&(v=parseInt(g.get("dotnet_version")));let m={name:g.get("name").trim(),php_version:parseInt(g.get("php_version"))||3,site_type:b,runtime_version:v,start_command:g.get("start_command")?.trim()||"",domains:g.get("domains").split(`
`).map(f=>f.trim()).filter(Boolean),install_wordpress:b===1?g.get("install_wordpress")==="on":!1};t.hide(),document.getElementById("kp-create-site-modal")?.remove(),y("Creating Site",`Setting up '${m.name}' \u2014 pulling images and provisioning containers...`);try{await d.post("/sites",m),h(),r.success(`Site '${m.name}' created`),k.go("sites")}catch(f){h(),r.error(f.message),p.disabled=!1,p.innerHTML=u}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}async function Q(e){let t=await d.get("/sites")??[];e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Sites</h1>
            <button class="uk-button kp-btn-primary" id="sites-new-btn">
                <span uk-icon="plus"></span> New Site
            </button>
        </div>
        <div class="kp-site-grid">
            ${t.length===0?D("world","No sites yet \u2014 create one to get started"):t.map(V).join("")}
        </div>`,document.getElementById("sites-new-btn").addEventListener("click",()=>_())}function V(e){let t=e.Domains?.[0]??null;return`
        <div class="kp-site-card" data-site-id="${e.ID}" data-status="${e.SiteStatus}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${e.ID}">${e.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${e.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${M(e.SiteType)}${P(e)?" / "+P(e):""}</span>
                        ${t?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${t}" target="_blank" style="color:var(--kp-cyan)">${t}</a></span>`:""}
                    </div>
                </div>
                ${E(e.SiteStatus)}
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
            ${t.length===0?D("world","No sites yet"):t.slice(0,6).map(V).join("")}
        </div>`,document.getElementById("dash-new-site")?.addEventListener("click",()=>_())}function R(e=null){let t=e?`/sites/${e}/security/ip`:"/security/ip",s=e?`/sites/${e}/security/ua`:"/security/ua",n=e?`/sites/${e}/waf`:"/settings/waf";return`
        <div id="security-panel" data-ip-base="${t}" data-ua-base="${s}" data-waf-base="${n}" ${e?`data-site-id="${e}"`:""}>

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

            <div class="kp-card uk-padding-small uk-margin-bottom">
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

            ${e?"":`
            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Trusted Proxy Ranges</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/trusted-proxies/export" download="podnest-trusted-proxies.csv" uk-tooltip="Export trusted proxies">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import trusted proxies from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-tp-import" accept=".csv" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-tp-save" uk-tooltip="Save Trusted Proxy Ranges">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    Custom IP ranges (one CIDR per line) to trust in addition to the
                    auto-fetched Cloudflare, Fastly, and CloudFront ranges.
                    <code>X-Forwarded-For</code> is only honoured when a request arrives
                    from one of these addresses.
                </p>
                <textarea class="uk-textarea kp-textarea kp-mono" id="sec-tp-cidrs" rows="15"
                    placeholder="192.168.1.0/24"></textarea>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    One IPv4 or IPv6 CIDR per line. Auto-fetched provider ranges are
                    managed automatically and do not need to be entered here.
                </p>
            </div>

            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Web Application Firewall</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/waf/export" download="podnest-waf-settings.json" uk-tooltip="Export WAF settings">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import WAF settings from JSON">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-waf-import" accept=".json" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-waf-save" uk-tooltip="Save WAF Settings">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    Inspects all proxied requests using the OWASP Core Rule Set.
                    Start in Detection mode to review false positives before enabling Prevention.
                    The engine recompiles in the background after saving.
                </p>
                <div class="uk-grid-small uk-margin-small-bottom" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label" for="sec-waf-mode">Mode</label>
                        <select class="uk-select kp-select" id="sec-waf-mode">
                            <option value="0">Detection \u2014 log matches only</option>
                            <option value="1">Prevention \u2014 block matching requests</option>
                        </select>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label" for="sec-waf-paranoia">Paranoia Level</label>
                        <select class="uk-select kp-select" id="sec-waf-paranoia">
                            <option value="1">1 \u2014 Baseline (recommended)</option>
                            <option value="2">2 \u2014 Moderate</option>
                            <option value="3">3 \u2014 Strict</option>
                            <option value="4">4 \u2014 Paranoid</option>
                        </select>
                    </div>
                </div>
                <div class="uk-grid-small uk-margin-small-bottom" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <input class="uk-checkbox" type="checkbox" id="sec-waf-enabled">
                            &nbsp;Enable WAF (OWASP Core Rule Set)
                        </label>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <input class="uk-checkbox" type="checkbox" id="sec-waf-audit">
                            &nbsp;Enable Audit Log
                        </label>
                    </div>
                </div>
                <div class="uk-margin-small-bottom">
                    <label class="kp-label" for="sec-waf-exclusions">Global Rule Exclusions</label>
                    <textarea class="uk-textarea kp-textarea kp-mono kp-waf-exclusions" id="sec-waf-exclusions" rows="15"
                        placeholder="# Numeric = rule ID, text = tag name, one per line&#10;920350&#10;attack-sqli"></textarea>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Numeric entries map to <span class="kp-mono">SecRuleRemoveById</span>;
                        text entries to <span class="kp-mono">SecRuleRemoveByTag</span>.
                    </p>
                </div>
            </div>
            `}

        </div>`}async function $(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,n=t.dataset.uaBase,a=t.dataset.wafBase;try{let i=[d.get(s),d.get(n)];t.dataset.siteId||i.push(d.get(a),d.get("/settings/trusted-proxies"));let[o,c,l,p]=await Promise.all(i);if(e.querySelector("#sec-ip-whitelist").value=o.whitelist??"",e.querySelector("#sec-ip-blacklist").value=o.blacklist??"",e.querySelector("#sec-ua-whitelist").value=c.whitelist??"",e.querySelector("#sec-ua-blacklist").value=c.blacklist??"",l){let u=e.querySelector("#sec-waf-enabled"),g=e.querySelector("#sec-waf-audit"),b=e.querySelector("#sec-waf-mode"),v=e.querySelector("#sec-waf-paranoia"),m=e.querySelector("#sec-waf-exclusions");u&&(u.checked=!!l.Enabled),g&&(g.checked=!!l.AuditLog),b&&(b.value=String(l.Mode??0)),v&&(v.value=String(l.ParanoiaLevel??1)),m&&(m.value=l.Exclusions??"")}if(p){let u=e.querySelector("#sec-tp-cidrs");u&&(u.value=p.trusted_proxies_custom??"")}}catch(i){r.error("Failed to load security rules: "+i.message)}}function A(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,n=t.dataset.uaBase;e.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let a=e.querySelector("#sec-ip-save"),i=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(s,{whitelist:e.querySelector("#sec-ip-whitelist").value,blacklist:e.querySelector("#sec-ip-blacklist").value}),r.success("IP rules saved")}catch(o){r.error(o.message)}finally{a.disabled=!1,a.innerHTML=i}}),e.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let a=e.querySelector("#sec-ua-save"),i=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(n,{whitelist:e.querySelector("#sec-ua-whitelist").value,blacklist:e.querySelector("#sec-ua-blacklist").value}),r.success("UA rules saved")}catch(o){r.error(o.message)}finally{a.disabled=!1,a.innerHTML=i}}),e.querySelector("#sec-tp-save")?.addEventListener("click",async()=>{let a=e.querySelector("#sec-tp-save"),i=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put("/settings/trusted-proxies",{trusted_proxies_custom:e.querySelector("#sec-tp-cidrs").value.trim()}),r.success("Trusted proxy ranges saved")}catch(o){r.error(o.message)}finally{a.disabled=!1,a.innerHTML=i}}),e.querySelector("#sec-tp-import")?.addEventListener("change",async a=>{let i=a.target.files[0];if(!i)return;let o=new FormData;o.append("file",i);try{let c=await fetch("/api/settings/trusted-proxies/import",{method:"POST",body:o}),l=c.status===204?null:await c.json().catch(()=>null);if(!c.ok)throw new Error(l?.error||`HTTP ${c.status}`);await $(e),r.success("Trusted proxies imported")}catch(c){r.error(c.message)}finally{a.target.value=""}}),e.querySelector("#sec-waf-save")?.addEventListener("click",async()=>{let a=e.querySelector("#sec-waf-save"),i=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(t.dataset.wafBase,{enabled:e.querySelector("#sec-waf-enabled").checked,mode:parseInt(e.querySelector("#sec-waf-mode").value,10),paranoia_level:parseInt(e.querySelector("#sec-waf-paranoia").value,10),audit_log:e.querySelector("#sec-waf-audit").checked,exclusions:e.querySelector("#sec-waf-exclusions").value.trim()}),r.success("WAF settings saved \u2014 engine recompiling in background")}catch(o){r.error(o.message)}finally{a.disabled=!1,a.innerHTML=i}}),e.querySelector("#sec-ip-import")?.addEventListener("change",async a=>{let i=a.target.files[0];if(!i)return;let o=new FormData;o.append("file",i);try{let c=await fetch("/api"+s+"/import",{method:"POST",body:o}),l=c.status===204?null:await c.json().catch(()=>null);if(!c.ok)throw new Error(l?.error||`HTTP ${c.status}`);await $(e),r.success("IP rules imported")}catch(c){r.error(c.message)}finally{a.target.value=""}}),e.querySelector("#sec-ua-import")?.addEventListener("change",async a=>{let i=a.target.files[0];if(!i)return;let o=new FormData;o.append("file",i);try{let c=await fetch("/api"+n+"/import",{method:"POST",body:o}),l=c.status===204?null:await c.json().catch(()=>null);if(!c.ok)throw new Error(l?.error||`HTTP ${c.status}`);await $(e),r.success("UA rules imported")}catch(c){r.error(c.message)}finally{a.target.value=""}}),e.querySelector("#sec-waf-import")?.addEventListener("change",async a=>{let i=a.target.files[0];if(!i)return;let o=new FormData;o.append("file",i);try{let c=await fetch("/api/settings/waf/import",{method:"POST",body:o}),l=c.status===204?null:await c.json().catch(()=>null);if(!c.ok)throw new Error(l?.error||`HTTP ${c.status}`);await $(e),r.success("WAF settings imported")}catch(c){r.error(c.message)}finally{a.target.value=""}})}async function Y(e){if(!T()){e.innerHTML=S("Access denied");return}e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 a blacklisted entry cannot be overridden by any whitelist.
        </p>
        ${R(null)}`,A(e),$(e)}function he(e){switch(e){case"valid":case"self-signed":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function J(e){let t=document.getElementById("admin-domain-ssl");if(!(!t||!e))try{let s=await d.get(`/ssl-status?domain=${encodeURIComponent(e)}`);t.outerHTML=he(s.status)}catch{}}async function X(e){if(!T()){e.innerHTML=S("Access denied");return}let[t,s,n,a]=await Promise.all([d.get("/settings"),d.get("/settings/backup"),d.get("/settings/waf"),d.get("/settings/trusted-proxies")]);e.innerHTML=`
    <div class="kp-view-header">
        <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Settings</h1>
    </div>
    <div class="uk-grid uk-grid-medium uk-margin-large-bottom" uk-grid>
        <div class="uk-width-1-1">
            <!-- panel configuration -->
            <div class="kp-card uk-padding">
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
                </form>
            </div>
        </div>
        <div class="uk-width-1-2@m">
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
        </div>
        <div class="uk-width-1-2@m">
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
                    <div class="uk-flex uk-flex-right uk-margin-small-top" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/export" download="podnest-settings.csv" uk-tooltip="Export all settings">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import settings from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="settings-import" accept=".csv" style="display:none">
                        </label>
                    </div>
                </form>
            </div>
        </div>
        <div class="uk-width-1-1">
            <!-- leaving this here for future settings sections -->
        </div>
    </div>
    `,t.admin_domain&&J(t.admin_domain),document.getElementById("settings-form").addEventListener("submit",async i=>{i.preventDefault();let o=i.target.querySelector('[type="submit"]'),c=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let p={admin_domain:new FormData(i.target).get("admin_domain").trim()};try{await d.put("/settings",p),r.success("Settings saved"),J(p.admin_domain)}catch(u){r.error(u.message)}finally{o.disabled=!1,o.innerHTML=c}}),document.getElementById("settings-import").addEventListener("change",async i=>{let o=i.target.files[0];if(!o)return;let c=new FormData;c.append("file",o);try{let l=await fetch("/api/settings/import",{method:"POST",body:c}),p=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(p?.error||`HTTP ${l.status}`);r.success("Settings imported")}catch(l){r.error(l.message)}finally{i.target.value=""}}),document.getElementById("backup-form").addEventListener("submit",async i=>{i.preventDefault();let o=i.target.querySelector('[type="submit"]'),c=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let l=new FormData(i.target),p={backup_schedule:l.get("backup_schedule").trim(),backup_retain_days:l.get("backup_retain_days").trim()};try{await d.put("/settings/backup",p),r.success("Backup settings saved")}catch(u){r.error(u.message)}finally{o.disabled=!1,o.innerHTML=c}}),document.getElementById("s3-form").addEventListener("submit",async i=>{i.preventDefault();let o=i.target.querySelector('[type="submit"]'),c=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let l=new FormData(i.target),p={s3_endpoint:l.get("s3_endpoint").trim(),s3_bucket:l.get("s3_bucket").trim(),s3_region:l.get("s3_region").trim(),s3_access_key:l.get("s3_access_key").trim()},u=l.get("s3_secret_key").trim();u&&(p.s3_secret_key=u);try{await d.put("/settings/backup",p),r.success("S3 settings saved")}catch(g){r.error(g.message)}finally{o.disabled=!1,o.innerHTML=c}})}function Z(e){return`
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

        </div>`}function ye(e){if(!e||e.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>';let t=a=>a===2?'<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>':'<span class="kp-mono" style="color:var(--kp-blue)">Local</span>',s=a=>a<1024?`${a} B`:a<1048576?`${(a/1024).toFixed(1)} KB`:a<1073741824?`${(a/1048576).toFixed(1)} MB`:`${(a/1073741824).toFixed(2)} GB`;return`
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
        </table>`}async function B(e,t){try{let[s,n]=await Promise.all([d.get(`/sites/${t}/backup-repo`),d.get(`/sites/${t}/backups`)]),a=e.querySelector("#backup-local-enabled"),i=e.querySelector("#backup-s3-enabled");a&&(a.checked=!!s.LocalEnabled),i&&(i.checked=!!s.S3Enabled);let o=e.querySelector("#backup-error-banner");if(o)if(s.last_error){let l=s.last_error_at?` (${new Date(s.last_error_at).toLocaleString()})`:"";o.innerHTML=`
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${l}:</strong> ${s.last_error}</p>
                    </div>`}else o.innerHTML="";let c=e.querySelector("#backup-list-wrap");c&&(c.innerHTML=ye(n))}catch(s){let n=e.querySelector("#backup-list-wrap");n&&(n.innerHTML=`<p class="kp-muted uk-text-small">Failed to load backups: ${s.message}</p>`)}}function ee(e,t){e.querySelector("#backup-repo-save")?.addEventListener("click",async()=>{let s={local_enabled:e.querySelector("#backup-local-enabled")?.checked??!1,s3_enabled:e.querySelector("#backup-s3-enabled")?.checked??!1};try{await d.put(`/sites/${t}/backup-repo`,s),r.success("Backup destinations saved")}catch(n){r.error(n.message)}}),e.querySelector("#backup-run-btn")?.addEventListener("click",async()=>{let s=0;try{s=(await d.get(`/sites/${t}/backups`))?.length??0}catch{}try{await d.post(`/sites/${t}/backups`,{label:"manual"})}catch(i){r.error(i.message);return}y("Backup Running","Snapshotting files and database \u2014 this may take a few minutes.");let n=Date.now()+600*1e3,a=setInterval(async()=>{try{(((await d.get(`/sites/${t}/backups`))?.length??0)>s||Date.now()>n)&&(clearInterval(a),h(),await B(e,t),Date.now()<=n&&r.success("Backup complete"))}catch{}},4e3)}),e.querySelector("#backup-list-wrap")?.addEventListener("click",async s=>{let n=s.target.closest(".backup-restore-btn");if(n){let o=n.dataset.id;if(!await w("Restore Site","This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"))return;try{await d.post(`/sites/${t}/backups/${o}/restore`)}catch(g){r.error(g.message);return}y("Restore Running","Restoring files and database \u2014 the site will return automatically when complete.");let l=Date.now(),p=Date.now()+900*1e3,u=setInterval(async()=>{try{let g=await d.get(`/sites/${t}/backups/restore-status`);(!g?.active||Date.now()>p)&&(clearInterval(u),h(),g?.active?r.error("Restore timed out"):r.success("Restore complete"),await B(e,t))}catch{}},3e3);return}let a=s.target.closest(".backup-delete-btn");if(a){let o=a.dataset.id;if(!await w("Delete Snapshot","This will permanently remove the snapshot from all configured repositories. This cannot be undone."))return;y("Deleting Snapshot","Removing snapshot data from repositories \u2014 this may take a moment.");try{await d.delete(`/sites/${t}/backups/${o}`),h(),r.success("Snapshot deleted"),await B(e,t)}catch(l){h(),r.error(l.message)}}let i=s.target.closest(".backup-download-btn");if(i){let o=i.dataset.id;y("Preparing Download","Your backup archive is being generated \u2014 this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."),setTimeout(()=>{let c=document.createElement("a");c.href=`/api/sites/${t}/backups/${o}/download`,c.style.display="none",document.body.appendChild(c),c.click(),document.body.removeChild(c),setTimeout(()=>{h()},5e3)},300);return}})}var N={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis",5:"Varnish"};function C(e,t,s){let n=s?Object.entries(s):[];return`
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
        </div>`}function te(e,t){let s=t?.enabled==="true",n=t?Object.entries(t).filter(([a])=>a!=="enabled"):[];return`
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
    </div>`}function se(e,t){e.addEventListener("click",s=>{if(s.target.closest(".cfg-add-row")){let n=s.target.closest(".cfg-add-row");e.querySelector(`.cfg-rows[data-type="${n.dataset.type}"]`).insertAdjacentHTML("beforeend",I())}}),e.addEventListener("click",s=>{s.target.closest(".cfg-del-row")&&s.target.closest(".kp-config-row").remove()}),e.addEventListener("click",async s=>{let n=s.target.closest(".cfg-save");if(!n)return;let{type:a,site:i}=n.dataset,o=e.querySelectorAll(`.cfg-rows[data-type="${a}"] .kp-config-row`),c={};if(o.forEach(l=>{let p=l.querySelector(".cfg-key").value.trim(),u=l.querySelector(".cfg-val").value.trim();p&&(c[p]=u)}),a==="5"){let l=e.querySelector(".varnish-enabled-toggle");c.enabled=l?.checked?"true":"false"}try{await d.put(`/sites/${i}/configs/${a}`,c),r.success(`${N[a]} config saved`)}catch(l){r.error(l.message)}}),e.addEventListener("click",async s=>{let n=s.target.closest(".cfg-reset");if(!n)return;let{type:a,site:i}=n.dataset;if(await w("Reset Config",`Reset ${N[a]} config to defaults?`))try{let c=await d.post(`/sites/${i}/configs/${a}/reset`),l=e.querySelector(`.cfg-rows[data-type="${a}"]`);l.innerHTML=Object.entries(c).map(([p,u])=>I(p,u)).join(""),r.success(`${N[a]} reset to defaults`)}catch(c){r.error(c.message)}}),e.addEventListener("change",async s=>{let n=s.target.closest(".cfg-import-input");if(!n)return;let{type:a,site:i}=n.dataset,o=n.files[0];if(!o)return;let c=new FormData;c.append("file",o);try{let l=await fetch(`/api/sites/${i}/configs/${a}/import`,{method:"POST",body:c}),p=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(p?.error||`HTTP ${l.status}`);let u=e.querySelector(`.cfg-rows[data-type="${a}"]`);u.innerHTML=Object.entries(p).map(([g,b])=>I(g,b)).join(""),r.success(`${N[a]} config imported`)}catch(l){r.error(l.message)}finally{n.value=""}})}function ae(e,t){return`
        <div>
            <div class="kp-log-controls">
                <select class="uk-select kp-select" id="log-container" style="width:140px;height:38px">
                    <option value="nginx">Nginx</option>
                    ${(()=>{switch(t){case 1:case 2:return'<option value="php">PHP-FPM</option>';case 4:return'<option value="app">Node.js</option>';case 5:return'<option value="app">.NET</option>';default:return""}})()}
                    <option value="db">MariaDB</option>
                    <option value="redis">Redis</option>
                    <option value="waf">WAF Log</option>
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
        </div>`}function ne(e,t){let s=null,n=!1,a=e.querySelector("#log-output"),i=e.querySelector("#log-connect"),o=e.querySelector("#log-disconnect"),c=e.querySelector("#log-clear"),l=e.querySelector("#log-autoscroll"),p=e.querySelector("#log-status");function u(v){v.split(`
`).forEach(m=>{if(!m)return;let f=document.createElement("div");f.className=m.match(/WAF BLOCK/i)?"kp-log-line-err":m.match(/WAF DETECT/i)?"kp-log-line-warn":m.match(/error|crit|emerg/i)?"kp-log-line-err":m.match(/warn/i)?"kp-log-line-warn":m.match(/info|notice/i)?"kp-log-line-info":"",f.textContent=m,a.appendChild(f)}),l.checked&&(a.scrollTop=a.scrollHeight)}function g(){s&&(s.close(),s=null),n=!1,i.disabled=!1,o.disabled=!0,p&&(p.textContent="Disconnected")}i.addEventListener("click",()=>{g();let v=e.querySelector("#log-container").value,m=e.querySelector("#log-tail").value,f=location.protocol==="https:"?"wss":"ws",x=v==="waf"?`${f}://${location.host}/api/sites/${t}/logs/waf?tail=${m}`:`${f}://${location.host}/api/sites/${t}/logs?container=${v}&tail=${m}`;s=new WebSocket(x),s.onopen=()=>{n=!0,i.disabled=!0,o.disabled=!1,p&&(p.textContent=`Connected \u2014 ${v}`)},s.onmessage=W=>u(W.data),s.onerror=()=>{},s.onclose=()=>{n=!1,i.disabled=!1,o.disabled=!0,p&&(p.textContent="Disconnected")}}),o.addEventListener("click",g),c.addEventListener("click",()=>{a.innerHTML=""}),e.querySelector("#log-container").addEventListener("change",()=>{s&&s.readyState===WebSocket.OPEN&&(g(),i.click())});let b=k.go.bind(k);k.go=function(v,m={}){return s&&g(),b(v,m)}}function we(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function ie(e,t){try{let s=await d.get(`/ssl-status?domain=${encodeURIComponent(e)}`),n=document.getElementById(`ssl-icon-${t}`);n&&(n.outerHTML=we(s.status))}catch{}}function oe(e){e.forEach(t=>ie(t.Domain,t.ID))}function le(e,t,s){let n=e.SiteType!==3&&e.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${e.Name}</td></tr>
                            <tr><td class="kp-muted">Internal Port</td><td>:${e.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${M(e.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${P(e)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${E(e.SiteStatus)}</td></tr>
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
                        ${t.length?t.map(re).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
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
        </div>`}function re(e){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${e.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${e.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <span class="uk-text-small kp-mono">${e.Domain}</span>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${e.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function ce(e,t){e.querySelector("#domain-add-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.remove("uk-hidden")}),e.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.add("uk-hidden")}),e.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#domain-add-input").value.trim();if(s)try{let n=await d.post(`/sites/${t}/domains`,{domain:s});e.querySelector("#domain-list").insertAdjacentHTML("beforeend",re(n)),ie(n.Domain,n.ID),e.querySelector("#domain-add-form").classList.add("uk-hidden"),e.querySelector("#domain-add-input").value="",r.success("Domain added")}catch(n){r.error(n.message)}}),e.querySelector("#domain-list")?.addEventListener("click",async s=>{let n=s.target.closest('[data-action="delete-domain"]');if(!(!n||!await w("Remove Domain","Remove this domain from the site?")))try{await d.delete(`/sites/${t}/domains/${n.dataset.did}`),n.closest("[data-domain-id]").remove(),r.success("Domain removed")}catch(i){r.error(i.message)}})}function de(e,t){e.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#sftp-regen-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.post(`/sites/${t}/sftp-regen`),r.success("SFTP password regenerated"),k.go("site-detail",{id:String(t)})}catch(a){r.error(a.message),s.disabled=!1,s.innerHTML=n}}),e.querySelector("#sftp-copy-btn")?.addEventListener("click",()=>{let s=e.querySelector("#sftp-pass-display")?.textContent;if(s)if(navigator.clipboard)navigator.clipboard.writeText(s).then(()=>r.success("Password copied to clipboard")).catch(()=>r.error("Failed to copy password"));else{let n=document.createElement("textarea");n.value=s,n.style.cssText="position:fixed;opacity:0",document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n),r.success("Password copied to clipboard")}}),e.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#pma-open-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let a=await d.post(`/sites/${t}/pma-token`);window.open(a.url,"_blank")}catch(a){r.error(a.message)}finally{s.disabled=!1,s.innerHTML=n}})}var xe=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function pe(e){return`
        <div>
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${xe.map(t=>`
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
        </div>`}function ue(e,t){let s=e.querySelector("#wpcli-output"),n=e.querySelector("#wpcli-input"),a=e.querySelector("#wpcli-run"),i=e.querySelector("#wpcli-clear"),o=e.querySelector("#wpcli-status"),c=[],l=-1;function p(b,v=""){b.split(`
`).forEach(m=>{if(!m)return;let f=document.createElement("div");v?f.className=v:f.className=m.match(/error|fatal|critical/i)?"kp-log-line-err":m.match(/warning|warn/i)?"kp-log-line-warn":m.match(/success|done\]/i)?"kp-log-line-info":"",f.textContent=m,s.appendChild(f)}),s.scrollTop=s.scrollHeight}function u(b){if(b=b.trim(),!b)return;c.unshift(b),l=-1,p(`wp> ${b}`,"kp-log-line-info"),n.disabled=!0,a.disabled=!0,o&&(o.textContent="Running...");let v=location.protocol==="https:"?"wss":"ws",m=new WebSocket(`${v}://${location.host}/api/sites/${t}/wpcli`);m.onopen=()=>{m.send(JSON.stringify({command:b}))},m.onmessage=f=>{let x=f.data;if(x.trim()==="[done]"){m.close();return}if(x.startsWith("[info]")){p(x,"kp-muted");return}if(x.startsWith("[error]")){p(x,"kp-log-line-err");return}p(x)},m.onerror=()=>{p("[error] WebSocket connection failed","kp-log-line-err")},m.onclose=()=>{n.disabled=!1,a.disabled=!1,o&&(o.textContent="Ready"),n.focus()}}a.addEventListener("click",()=>{u(n.value),n.value=""}),n.addEventListener("keydown",b=>{if(b.key==="Enter"){u(n.value),n.value="",l=-1;return}if(b.key==="ArrowUp"){b.preventDefault(),l<c.length-1&&(l++,n.value=c[l]);return}b.key==="ArrowDown"&&(b.preventDefault(),l>0?(l--,n.value=c[l]):(l=-1,n.value=""))}),e.querySelectorAll('[data-action="wpcli-quick"]').forEach(b=>{b.addEventListener("click",()=>{let v=b.dataset.cmd;if(v.startsWith("search-replace")){n.value=v,n.focus();let m=v.indexOf("''")+1;n.setSelectionRange(m,m);return}u(v)})}),i.addEventListener("click",()=>{s.innerHTML=""});let g=k.go.bind(k);k.go=function(b,v={}){return g(b,v)},n.focus()}function Se(){return`
        <div class="kp-card uk-padding uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">WAF Override</h3>
            <form id="waf-override-form" class="uk-form-stacked">
                <div class="uk-margin">
                    <label class="kp-label" for="waf-override">Site Behaviour</label>
                    <select class="uk-select kp-select" id="waf-override" name="override">
                        <option value="0">Inherit global setting</option>
                        <option value="1">Force ON for this site</option>
                        <option value="2">Force OFF for this site</option>
                    </select>
                </div>
                <div class="uk-margin">
                    <label class="kp-label">CRS Plugins</label>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Select OWASP CRS plugins to enable for this site. Only plugins present in the
                        local CRS install are shown. Changes recompile the site WAF engine in the background.
                    </p>
                    <div id="waf-plugins-list" class="uk-margin-small-top">
                        <span class="kp-muted uk-text-small">Loading available plugins\u2026</span>
                    </div>
                </div>
                <div class="uk-margin">
                    <label class="kp-label" for="waf-site-exclusions">Additional Rule Exclusions</label>
                    <textarea
                        class="uk-textarea kp-input kp-mono kp-waf-exclusions"
                        id="waf-site-exclusions"
                        name="exclusions"
                        rows="15"
                        placeholder="# Numeric = rule ID, text = tag name, one per line&#10;942100&#10;attack-xss"></textarea>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Merged on top of global exclusions. Useful for WooCommerce, contact forms, or file upload paths that trigger false positives.
                    </p>
                </div>
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <a class="uk-button kp-btn-ghost" id="waf-export-btn" href="#" uk-tooltip="Export WAF settings">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost" style="cursor:pointer" uk-tooltip="Import WAF settings">
                        <span uk-icon="upload"></span>
                        <input type="file" id="waf-import" accept=".json" style="display:none">
                    </label>
                    <button type="submit" class="uk-button kp-btn-primary">
                        <span uk-icon="check"></span> Save
                    </button>
                </div>
            </form>
        </div>`}async function me(e){let t=document.getElementById("waf-tab-panel");if(!t)return;t.innerHTML=Se();let s=document.getElementById("waf-export-btn");s&&(s.href=`/api/sites/${e}/waf/export`);try{let n=await d.get(`/sites/${e}/waf`),a=document.getElementById("waf-override"),i=document.getElementById("waf-site-exclusions");a&&(a.value=String(n.Override??0)),i&&(i.value=n.Exclusions??"");let o=document.getElementById("waf-plugins-list");if(o){let[c,l]=await Promise.all([d.get("/settings/waf/plugins"),d.get(`/sites/${e}/waf/plugins`)]),p=new Set(l??[]);!c||c.length===0?o.innerHTML='<span class="kp-muted uk-text-small">No plugins found in local CRS install.</span>':(o.innerHTML=`
                    <div class="waf-plugin-pills">
                        ${c.map(u=>`
                        <span class="waf-plugin-pill ${p.has(u)?"active":""}"
                            data-plugin="${u}">${u}</span>
                        `).join("")}
                    </div>`,o.querySelectorAll(".waf-plugin-pill").forEach(u=>{u.addEventListener("click",()=>u.classList.toggle("active"))}))}}catch(n){r.error("Failed to load WAF settings: "+n.message)}}function $e(e,t){e.addEventListener("submit",async s=>{if(s.target.id!=="waf-override-form")return;s.preventDefault();let n=s.target.querySelector('[type="submit"]'),a=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let i=new FormData(s.target),o={override:parseInt(i.get("override"),10),exclusions:i.get("exclusions").trim()};try{await d.put(`/sites/${t}/waf`,o);let c=[...document.querySelectorAll(".waf-plugin-pill.active")].map(l=>l.dataset.plugin);await d.put(`/sites/${t}/waf/plugins`,c),r.success("WAF override saved \u2014 engine recompiling in background")}catch(c){r.error(c.message)}finally{n.disabled=!1,n.innerHTML=a}}),e.querySelector("#waf-import")?.addEventListener("change",async s=>{let n=s.target.files[0];if(!n)return;let a=new FormData;a.append("file",n);try{let i=await fetch(`/api/sites/${t}/waf/import`,{method:"POST",body:a}),o=i.status===204?null:await i.json().catch(()=>null);if(!i.ok)throw new Error(o?.error||`HTTP ${i.status}`);await me(t),r.success("WAF settings imported")}catch(i){r.error(i.message)}finally{s.target.value=""}})}async function ke(e,{id:t}){let[{site:s,domains:n,sftp:a},i,o]=await Promise.all([d.get(`/sites/${t}`),d.get("/sites"),d.get(`/sites/${t}/configs`)]),c=s.SiteType===1||s.SiteType===2;e.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <div class="kp-site-nav-wrap">
                    <select id="sd-site-nav" class="uk-select kp-select">
                        ${i.map(l=>`<option value="${l.ID}" ${l.ID===s.ID?"selected":""}>${l.Name}</option>`).join("")}
                    </select>
                    <span class="kp-site-nav-arrow">&#9660;</span>
                </div>
                ${E(s.SiteStatus)}
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
            <li><a href="#">WAF</a></li>
            ${s.SiteType===1?'<li><a href="#">WP-CLI</a></li>':""}
            <li><a href="#">Backups</a></li>
        </ul>

        <ul class="uk-switcher">
            <li>${le(s,n??[],a)}</li>
            <li>${C(t,1,o[1])}</li>
            ${c?`<li>${C(t,2,o[2])}</li>`:""}
            <li>${C(t,3,o[3])}</li>
            <li>${C(t,4,o[4])}</li>
            <li>${te(t,o[5])}</li>
            <li>${ae(t,s.SiteType)}</li>
            <li>${R(t)}</li>
            <li id="waf-tab-panel"></li>
            ${s.SiteType===1?`<li>${pe(t)}</li>`:""}            
            <li>${Z(t)}</li>
        </ul>`,document.getElementById("sd-back").addEventListener("click",()=>k.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>H(s)),document.getElementById("sd-recreate").addEventListener("click",async()=>{y("Recreating Pod","Recreating containers for this site...");try{await d.post(`/sites/${t}/recreate`),h(),r.success("Pod recreated"),k.go("site-detail",{id:t})}catch(l){h(),r.error(l.message)}}),document.getElementById("sd-site-nav")?.addEventListener("change",l=>{k.go("site-detail",{id:l.target.value})}),e.querySelectorAll("[data-action]").forEach(l=>{l.addEventListener("click",async()=>{let p=l.dataset.action;if(p==="flush"){try{await d.post(`/sites/${t}/flush`),r.success("Caches flushed")}catch(g){r.error(g.message)}return}y(`${{start:"Starting",stop:"Stopping",restart:"Restarting",update:"Updating"}[p]??p} Pod`,"Please wait...");try{await d.post(`/sites/${t}/${p}`),h(),r.success(`Site ${p} successful`),k.go("site-detail",{id:t})}catch(g){h(),r.error(g.message)}})}),se(e,t),ce(e,t),ne(e,t),A(e),s.SiteType===1&&ue(e,t),$(e),$e(e,t),me(t),de(e,t),ee(e,t),B(e,t),oe(n??[])}async function F(e){let t=document.getElementById("totp-qr-img"),s=document.getElementById("totp-qr-wrap");if(!t||!s)return;if(s.querySelectorAll(".totp-uri-text").forEach(a=>a.remove()),typeof QRCode<"u")try{let a=await new Promise((i,o)=>{QRCode.toDataURL(e,{width:220,margin:2},(c,l)=>{c?o(c):i(l)})});t.src=a,t.style.display="";return}catch{}let n=document.createElement("p");n.className="totp-uri-text kp-muted uk-text-small",n.style.wordBreak="break-all",n.textContent=e,s.appendChild(n)}function U(e){document.getElementById("kp-backup-codes-modal")?.remove();let s=`
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
`),i=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(a).then(()=>{i.textContent="Copied!"});else{let o=document.createElement("textarea");o.value=a,o.style.cssText="position:fixed;opacity:0",document.body.appendChild(o),o.select();try{document.execCommand("copy"),i.textContent="Copied!"}catch{}o.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{n.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),k.go("users")})}function be(e){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let s=UIkit.modal("#kp-create-user-modal");s.show(),document.getElementById("create-user-form").addEventListener("submit",async n=>{n.preventDefault();let a=n.target.querySelector('[type="submit"]'),i=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let o=new FormData(n.target),c={fname:o.get("fname").trim(),lname:o.get("lname").trim(),uname:o.get("uname").trim(),email:o.get("email").trim(),phone:o.get("phone").trim(),password:o.get("password"),role:parseInt(o.get("role"))};try{let l=L(await d.post("/users",c));document.getElementById("users-table-body").insertAdjacentHTML("beforeend",z(l)),r.success(`User '${l.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",Ee(l.id,s)}catch(l){r.error(l.message),a.disabled=!1,a.innerHTML=i}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function Ee(e,t){let s=()=>{t.hide(),document.getElementById("kp-create-user-modal")?.remove(),k.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",s),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let n=document.getElementById("cu-totp-setup-btn");n.disabled=!0,n.textContent="Setting up\u2026";try{let a=await d.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=a.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await F(a.uri)}catch(a){r.error(a.message),n.disabled=!1,n.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let n=document.getElementById("totp-confirm-code").value.trim();if(n.length!==6){r.error("Enter a 6-digit code");return}let a=document.getElementById("cu-totp-confirm-btn");a.disabled=!0;try{let i=await d.post(`/users/${e}/totp/confirm`,{code:n});t.hide(),document.getElementById("kp-create-user-modal")?.remove(),r.success("TOTP enabled"),i.backup_codes?.length?U(i.backup_codes):k.go("users")}catch(i){r.error(i.message),a.disabled=!1}})}async function ge(e,t){document.getElementById("kp-edit-user-modal")?.remove();let s;try{s=L(await d.get(`/users/${t}`))}catch(p){r.error(p.message);return}let n=window.KP?.user?.role===99,a=`
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
        </div>`;document.body.insertAdjacentHTML("beforeend",a);let i=UIkit.modal("#kp-edit-user-modal");i.show(),document.getElementById("edit-user-form").addEventListener("submit",async p=>{p.preventDefault();let u=p.target.querySelector('[type="submit"]'),g=u.innerHTML;u.disabled=!0,u.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(p.target),v={fname:b.get("fname").trim(),lname:b.get("lname").trim(),email:b.get("email").trim(),phone:b.get("phone").trim()};if(n){v.role=parseInt(b.get("role"));let f=b.get("uname");f&&(v.uname=f.trim())}let m=b.get("password");m&&(v.password=m);try{await d.put(`/users/${t}`,v),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),r.success("User updated"),k.go("users")}catch(f){r.error(f.message),u.disabled=!1,u.innerHTML=g}});let o=document.getElementById("totp-setup-btn");o&&o.addEventListener("click",async()=>{o.disabled=!0,o.textContent="Setting up\u2026";try{let p=await d.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=p.secret,document.getElementById("totp-setup-area").style.display="",await F(p.uri)}catch(p){r.error(p.message),o.disabled=!1,o.textContent="Enable TOTP"}});let c=document.getElementById("totp-confirm-btn");c&&c.addEventListener("click",async()=>{let p=document.getElementById("totp-confirm-code").value.trim();if(p.length!==6){r.error("Enter a 6-digit code");return}c.disabled=!0;try{let u=await d.post(`/users/${t}/totp/confirm`,{code:p});i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),r.success("TOTP enabled"),u.backup_codes?.length?U(u.backup_codes):k.go("users")}catch(u){r.error(u.message),c.disabled=!1}});let l=document.getElementById("totp-disable-btn");l&&l.addEventListener("click",async()=>{l.disabled=!0;try{await d.delete(`/users/${t}/totp`),r.success("TOTP disabled"),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),k.go("users")}catch(p){r.error(p.message),l.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove())}async function ve(e){if(!T()){e.innerHTML=S("Access denied");return}let t=await d.get("/users");e.innerHTML=`
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
                    ${t.map(s=>z(L(s))).join("")}
                </tbody>
            </table>
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>be(e)),Te(e)}function z(e){let t=e.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>';return`<tr data-user-id="${e.id}">
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
    </tr>`}function Te(e){e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="delete-user"]');if(!(!s||!await w("Delete User","Delete this user? This cannot be undone.")))try{await d.delete(`/users/${s.dataset.uid}`),s.closest("tr").remove(),r.success("User deleted")}catch(a){r.error(a.message)}}),e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="edit-user"]');s&&ge(e,s.dataset.uid)})}k.register("dashboard",e=>G(e));k.register("sites",e=>Q(e));k.register("site-detail",(e,t)=>ke(e,t));k.register("users",e=>ve(e));k.register("settings",e=>X(e));k.register("security",e=>Y(e));document.addEventListener("click",e=>{let t=e.target.closest("[data-view]");if(!t)return;e.preventDefault(),k.go(t.dataset.view);let s=document.getElementById("kp-offcanvas");s&&UIkit.offcanvas(s).hide()});document.addEventListener("click",async e=>{let t=e.target.closest("[data-action]");if(!t)return;e.stopPropagation();let{action:s,id:n}=t.dataset;switch(s){case"manage":k.go("site-detail",{id:n});break;case"start":await q(n,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await q(n,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await q(n,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await q(n,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"edit":{let a=await d.get(`/sites/${n}`);H(a.site);break}case"delete":await Le(n);break;case"update":await q(n,"update","Updating Images","Pulling latest container images - this may take a few minutes...");break;case"recreate":y("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await d.post(`/sites/${n}/recreate`),h(),r.success("Pod recreated"),k.go("site-detail",{id:n})}catch(a){h(),r.error(a.message)}break}});async function q(e,t,s,n){y(s,n);try{await d.post(`/sites/${e}/${t}`),h(),r.success(s+" complete"),["start","stop","restart"].includes(t)&&k.go("sites")}catch(a){h(),r.error(a.message)}}async function Le(e){if(!await w("Delete Site","This will stop and permanently remove the pod and all its data. Are you sure?"))return;y("Deleting Site","Stopping containers and removing the pod - please wait...");try{await d.delete(`/sites/${e}`)}catch{}let s=!1,n=0;for(;!s&&n<10;){try{await new Promise(i=>setTimeout(i,2e3)),s=!(await d.get("/sites")).find(i=>i.ID===parseInt(e))}catch{}n++}h(),s?(r.success("Site deleted"),k.go("sites")):r.error("Delete failed - site still exists after 20s")}window.addEventListener("hashchange",()=>{let{view:e,params:t}=j();k.go(e,t)});var{view:Pe,params:Be}=j();k.go(Pe,Be);})();
