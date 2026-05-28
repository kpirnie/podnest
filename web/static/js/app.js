"use strict";(()=>{var d={async _req(e,t,a,s=6e4){let n=new AbortController,o=setTimeout(()=>n.abort(),s),i={method:e,headers:{"Content-Type":"application/json"},signal:n.signal};a!==void 0&&(i.body=JSON.stringify(a));try{let r=await fetch("/api"+t,i);clearTimeout(o);let c=r.status===204?null:await r.json().catch(()=>null);if(r.status===401)return window.location.href="/login?msg=Your+session+has+expired+%E2%80%94+please+log+in+again",null;if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);return c}catch(r){throw clearTimeout(o),r}},get:e=>d._req("GET",e),post:(e,t)=>d._req("POST",e,t),put:(e,t)=>d._req("PUT",e,t),delete:e=>d._req("DELETE",e),patch:(e,t)=>d._req("PATCH",e,t)};var se=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',L=e=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${e}</div>
    </div>`,F=(e,t)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${e}; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,P=e=>{let t={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[a,s]=t[e]||["stopped","Unknown"];return`<span class="kp-status kp-status-${a}">${s}</span>`},De=e=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[e]||"?",q=e=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET",6:"Reverse Proxy"})[e]||"?",B=()=>window.KP.user.role===window.KP.roles.admin,C=e=>{switch(e.SiteType){case 1:case 2:return`PHP ${De(e.PHPVersion)}`;case 4:return`Node ${{2:"22",4:"24",5:"25",6:"26"}[e.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[e.RuntimeVersion]||"?"}`;case 6:return"Reverse Proxy";default:return""}},D=e=>({id:e.id??e.ID,uname:e.uname??e.UName,uhash:e.uhash??e.UHash,fname:e.fname??e.FName,lname:e.lname??e.LName,email:e.email??e.Email,phone:e.phone??e.Phone,role:e.role??e.Role,totp_enabled:e.totp_enabled??!1,created:e.created??e.Created});function $(e,t){return new Promise(a=>{document.getElementById("kp-confirm-title").textContent=e,document.getElementById("kp-confirm-message").textContent=t;let s=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{s.hide(),a(!0)},{once:!0}),s.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>a(!1),{once:!0})})}function x(e,t){let a=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${e}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${t}</p>
                <p class="kp-muted">
                    This may take several minutes while the task(s) complete, make sure to keep screen open until it has completed.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",a),UIkit.modal("#kp-progress-modal").show()}function y(){let e=document.getElementById("kp-progress-modal");e&&(UIkit.modal(e).hide(),setTimeout(()=>e.remove(),300))}function U(e){return new Promise(t=>{let a="kp-clone-modal",s=`
            <div id="${a}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:420px">
                    <h3 class="uk-modal-title">Clone Site</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Enter a name for the clone of <strong>${e}</strong>.
                        Files, database, and configuration will be copied \u2014 domains will not.
                    </p>
                    <input id="kp-clone-name" class="uk-input kp-input" type="text"
                        placeholder="clone-name" autocomplete="off">
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-clone-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-clone-ok">
                            <span uk-icon="move"></span> Clone
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",s);let n=UIkit.modal(`#${a}`),o=document.getElementById("kp-clone-name"),i=document.getElementById("kp-clone-ok"),r=document.getElementById("kp-clone-cancel"),c=k=>{n.hide(),setTimeout(()=>document.getElementById(a)?.remove(),300),t(k)};i.addEventListener("click",()=>c(o.value.trim()||null),{once:!0}),r.addEventListener("click",()=>c(null),{once:!0}),document.getElementById(a).addEventListener("hidden",()=>c(null),{once:!0}),n.show(),setTimeout(()=>o.focus(),150),o.addEventListener("keydown",k=>{k.key==="Enter"&&i.click()})})}function Y(e,t,a){return new Promise(s=>{let n="kp-sync-modal",o=e==="pull",i=o?"Pull From Parent":"Push To Parent",r=o?"cloud-download":"cloud-upload",c=o?a:t,k=o?t:a,p=`
            <div id="${n}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                    <h3 class="uk-modal-title">${i}</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        This will overwrite all files and database content on
                        <strong>${k}</strong> with data from <strong>${c}</strong>.
                        This action cannot be undone.
                    </p>
                    <p class="kp-muted uk-text-small" style="color:var(--kp-red, #e05c5c)">
                        <span uk-icon="icon: warning; ratio: 0.85"></span>
                        <strong>${k}</strong> will be temporarily unavailable during the sync.
                    </p>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-sync-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-sync-ok">
                            <span uk-icon="${r}"></span> ${i}
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",p);let u=UIkit.modal(`#${n}`),m=document.getElementById("kp-sync-ok"),b=document.getElementById("kp-sync-cancel"),g=h=>{u.hide(),setTimeout(()=>document.getElementById(n)?.remove(),300),s(h)};m.addEventListener("click",()=>g(!0),{once:!0}),b.addEventListener("click",()=>g(!1),{once:!0}),document.getElementById(n).addEventListener("hidden",()=>g(!1),{once:!0}),u.show()})}var v={routes:{},_ownHashChange:!1,register(e,t){this.routes[e]=t},async go(e,t={}){let a=Object.keys(t).length?e+"/"+Object.values(t).join("/"):e;this._ownHashChange=!0,window.location.hash=a,setTimeout(()=>{this._ownHashChange=!1},0),document.querySelectorAll(".kp-nav-link").forEach(o=>{o.classList.toggle("kp-active",o.dataset.view===e)});let s=this.routes[e];if(!s)return;let n=document.getElementById("kp-view");n.innerHTML=se();try{await s(n,t)}catch(o){n.innerHTML=L(o.message)}}};function X(){let t=(window.location.hash.replace("#","")||"dashboard").split("/"),a=t[0],s={};return a==="site-detail"&&t[1]&&(s.id=t[1]),{view:a,params:s}}var l={show(e,t="info",a=7e3){let s={success:"check",error:"warning",info:"info"},n=document.createElement("div");n.className=`kp-toast kp-toast-${t}`,n.innerHTML=`<span uk-icon="${s[t]||"info"}"></span><span>${e}</span>`,document.getElementById("kp-toasts").appendChild(n),UIkit.icon(n.querySelector("[uk-icon]")),setTimeout(()=>n.remove(),a)},success:e=>l.show(e,"success"),error:e=>l.show(e,"error"),info:e=>l.show(e,"info")};async function j(e){let t=`
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
                                <option value="6" ${e.SiteType===6?"selected":""}>Reverse Proxy</option>
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
        </div>`;document.body.insertAdjacentHTML("beforeend",t);let a=UIkit.modal("#kp-edit-site-modal"),s=document.getElementById("es-site-type"),n=document.getElementById("es-php-version-wrap"),o=document.getElementById("es-node-version-wrap"),i=document.getElementById("es-dotnet-version-wrap"),r=document.getElementById("es-start-command-wrap"),c=document.getElementById("es-wordpress-wrap");a.show();let k=p=>{n.classList.toggle("uk-hidden",p!==1&&p!==2||p===6),o.classList.toggle("uk-hidden",p!==4),i.classList.toggle("uk-hidden",p!==5),r.classList.toggle("uk-hidden",p!==4&&p!==5),c.classList.toggle("uk-hidden",p!==1)};k(e.SiteType),s.addEventListener("change",()=>k(parseInt(s.value))),document.getElementById("edit-site-form").addEventListener("submit",async p=>{p.preventDefault();let u=p.target.querySelector('[type="submit"]'),m=u.innerHTML;u.disabled=!0,u.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(p.target),g=parseInt(b.get("site_type")),h=null;g===4&&(h=parseInt(b.get("node_version"))),g===5&&(h=parseInt(b.get("dotnet_version")));let f={name:b.get("name").trim(),php_version:parseInt(b.get("php_version"))||3,site_type:g,runtime_version:h,start_command:b.get("start_command")?.trim()||""},w=g===1?b.get("install_wordpress")==="on":!1;try{if(await d.put(`/sites/${e.ID}`,f),a.hide(),document.getElementById("kp-edit-site-modal")?.remove(),g!==6){x("Applying Changes","Saving changes and recreating pod...");try{await d.post(`/sites/${e.ID}/recreate`,{install_wordpress:w}),y(),l.success("Site updated and pod recreated")}catch(S){y(),l.error("Site saved but pod recreate failed: "+S.message)}}else l.success("Site updated");v.go("site-detail",{id:String(e.ID)})}catch(S){l.error(S.message),u.disabled=!1,u.innerHTML=m}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}function W(){document.body.insertAdjacentHTML("beforeend",`
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
                                <option value="6">Reverse Proxy</option>
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
                        <div class="uk-width-1-1" id="cs-domains-wrap">
                            <label class="kp-label">Domains (one per line)</label>
                            <textarea class="uk-textarea kp-textarea" name="domains" rows="3" placeholder="example.com&#10;www.example.com"></textarea>
                        </div>
                        <div class="uk-width-1-1 uk-hidden" id="cs-rp-note">
                            <p class="kp-muted uk-text-small">Configure domain \u2192 upstream mappings in the Routes tab after creation.</p>
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
        </div>`);let t=UIkit.modal("#kp-create-site-modal"),a=document.getElementById("cs-site-type"),s=document.getElementById("cs-php-version-wrap"),n=document.getElementById("cs-node-version-wrap"),o=document.getElementById("cs-dotnet-version-wrap"),i=document.getElementById("cs-start-command-wrap"),r=document.getElementById("cs-wordpress-wrap");t.show();let c=document.getElementById("cs-domains-wrap"),k=document.getElementById("cs-rp-note");a.addEventListener("change",()=>{let p=parseInt(a.value);s.classList.toggle("uk-hidden",p!==1&&p!==2||p===6),n.classList.toggle("uk-hidden",p!==4),o.classList.toggle("uk-hidden",p!==5),i.classList.toggle("uk-hidden",p!==4&&p!==5),r.classList.toggle("uk-hidden",p!==1||p===6),c.classList.toggle("uk-hidden",p===6),k.classList.toggle("uk-hidden",p!==6)}),document.getElementById("create-site-form").addEventListener("submit",async p=>{p.preventDefault();let u=p.target.querySelector('[type="submit"]'),m=u.innerHTML;u.disabled=!0,u.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let b=new FormData(p.target),g=parseInt(b.get("site_type")),h=null;g===4&&(h=parseInt(b.get("node_version"))),g===5&&(h=parseInt(b.get("dotnet_version")));let f={name:b.get("name").trim(),php_version:parseInt(b.get("php_version"))||3,site_type:g,runtime_version:h,start_command:b.get("start_command")?.trim()||"",domains:b.get("domains").split(`
`).map(S=>S.trim()).filter(Boolean),install_wordpress:g===1?b.get("install_wordpress")==="on":!1};t.hide(),document.getElementById("kp-create-site-modal")?.remove();let w=g===6?`Setting up '${f.name}' as a reverse proxy...`:`Setting up '${f.name}' \u2014 pulling images and provisioning containers...`;x("Creating Site",w);try{await d.post("/sites",f),y(),l.success(`Site '${f.name}' created`),v.go("sites")}catch(S){y(),l.error(S.message),u.disabled=!1,u.innerHTML=m}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}async function ne(e){let t=await d.get("/sites")??[];e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Sites</h1>
            <button class="uk-button kp-btn-primary" id="sites-new-btn" uk-tooltip="Create a New Site">
                <span uk-icon="plus"></span> New
            </button>
        </div>

        <!-- bulk action bar \u2014 always visible -->
        <div id="sites-bulk-bar" class="kp-bulk-bar">
            <div class="kp-bulk-actions">
                <span id="sites-bulk-count" class="kp-bulk-count">0 selected</span>
                <button class="uk-button kp-btn-secondary kp-btn-sm" id="bulk-start" disabled>
                    <span uk-icon="play"></span> Start
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" id="bulk-stop" disabled>
                    <span uk-icon="ban"></span> Stop
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" id="bulk-restart" disabled>
                    <span uk-icon="refresh"></span> Restart
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" id="bulk-flush" disabled>
                    <span uk-icon="bolt"></span> Flush Caches
                </button>
            </div>
            <input class="uk-input kp-input kp-input-sm kp-sites-search"
                   id="sites-search" type="text" placeholder="Filter sites\u2026" autocomplete="off">
        </div>

        ${t.length===0?F("world","No sites yet \u2014 create one to get started"):`<div class="kp-table-wrap">
                <div class="uk-overflow-auto">
                    <table class="uk-table uk-table-hover uk-table-divider uk-table-small uk-margin-remove">
                        <thead>
                            <tr>
                                <th class="uk-table-shrink">
                                    <input class="uk-checkbox" type="checkbox" id="sites-select-all" uk-tooltip="Select All">
                                </th>
                                <th class="kp-sortable" data-col="status">Status <span class="kp-sort-icon" data-col="status"></span></th>
                                <th class="kp-sortable" data-col="name">Name <span class="kp-sort-icon" data-col="name"></span></th>
                                <th class="uk-visible@s kp-sortable" data-col="type">Type <span class="kp-sort-icon" data-col="type"></span></th>
                                <th class="uk-visible@m">Port</th>
                                <th class="uk-visible@m kp-sortable" data-col="domain">Domain <span class="kp-sort-icon" data-col="domain"></span></th>
                                <th class="uk-table-shrink">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${t.map(a=>qe(a,t)).join("")}
                        </tbody>
                    </table>
                </div>
            </div>`}`,document.getElementById("sites-new-btn").addEventListener("click",()=>W()),Me()}function qe(e,t=[]){let a=e.Domains?.[0]??null,s=e.SiteType===6,n=e.ParentID>0?t.find(o=>o.ID===e.ParentID)??null:null;return`
        <tr data-site-id="${e.ID}" data-status="${e.SiteStatus}" data-type="${e.SiteType}">
            <!-- row checkbox -->
            <td class="uk-table-shrink">
                <input class="uk-checkbox kp-site-row-check" type="checkbox"
                       data-site-id="${e.ID}" data-site-type="${e.SiteType}">
            </td>
            <!-- status badge -->
            <td class="uk-table-shrink kp-site-row-status">${s?"":P(e.SiteStatus)}</td>

            <!-- name + optional parent clone link -->
            <td>
                <a class="kp-site-row-name" href="javascript:void(0)"
                   data-action="manage" data-id="${e.ID}">${e.Name}</a>
                ${n?`<div class="kp-muted uk-text-small kp-mono">
                           <span uk-icon="icon: git-fork; ratio: 0.7"></span>
                           <a href="javascript:void(0)" data-action="manage" data-id="${n.ID}"
                              style="color:var(--kp-cyan)">${n.Name}</a>
                       </div>`:""}
            </td>

            <!-- type / runtime version -->
            <td class="uk-visible@s kp-muted kp-mono uk-text-small">
                ${q(e.SiteType)}${C(e)?" / "+C(e):""}
            </td>

            <!-- internal port -->
            <td class="uk-visible@m kp-muted kp-mono uk-text-small">:${e.Port}</td>

            <!-- primary domain -->
            <td class="uk-visible@m uk-text-small">
                ${a?`<a href="http://${a}" target="_blank"
                          style="color:var(--kp-cyan)">${a}</a>`:'<span class="kp-muted">\u2014</span>'}
            </td>

            <!-- action buttons -->
            <td class="uk-table-shrink">
                <div class="kp-site-row-actions">
                    <button class="uk-button kp-btn-secondary kp-btn-sm"
                            data-action="manage" data-id="${e.ID}"
                            uk-tooltip="Manage">
                        <span uk-icon="icon: cog;"></span>
                    </button>
                    ${s?"":`
                    ${e.SiteStatus===1?`<button class="uk-button kp-btn-secondary kp-btn-sm"
                                   data-action="stop" data-id="${e.ID}"
                                   uk-tooltip="Stop">
                               <span uk-icon="icon: ban;"></span>
                           </button>`:`<button class="uk-button kp-btn-secondary kp-btn-sm"
                                   data-action="start" data-id="${e.ID}"
                                   uk-tooltip="Start">
                               <span uk-icon="icon: play;"></span>
                           </button>`}
                    <button class="uk-button kp-btn-secondary kp-btn-sm"
                            data-action="restart" data-id="${e.ID}"
                            uk-tooltip="Restart">
                        <span uk-icon="icon: refresh;"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm"
                            data-action="flush" data-id="${e.ID}"
                            uk-tooltip="Flush Caches">
                        <span uk-icon="icon: bolt;"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm"
                            data-action="recreate" data-id="${e.ID}"
                            uk-tooltip="Recreate Pod">
                        <span uk-icon="icon: history;"></span>
                    </button>
                    `}
                    <button class="uk-button kp-btn-ghost kp-btn-sm"
                            data-action="clone" data-id="${e.ID}" data-name="${e.Name}"
                            uk-tooltip="Clone">
                        <span uk-icon="icon: move;"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm"
                            data-action="edit" data-id="${e.ID}"
                            uk-tooltip="Edit">
                        <span uk-icon="icon: pencil;"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm"
                            data-action="delete" data-id="${e.ID}"
                            uk-tooltip="Delete">
                        <span uk-icon="icon: trash;"></span>
                    </button>
                </div>
            </td>
        </tr>`}function oe(e,t=[]){let a=e.Domains?.[0]??null,s=e.SiteType===6,n=e.ParentID>0?t.find(o=>o.ID===e.ParentID)??null:null;return`
        <div class="kp-site-card" data-site-id="${e.ID}" data-status="${e.SiteStatus}" data-type="${e.SiteType}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${e.ID}">${e.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${e.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${q(e.SiteType)}${C(e)?" / "+C(e):""}</span>
                        ${a?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${a}" target="_blank" style="color:var(--kp-cyan)">${a}</a></span>`:""}
                    </div>
                    ${n?`<div class="kp-site-meta kp-muted uk-text-small uk-margin-small-top"><span uk-icon="icon: git-fork; ratio: 0.75"></span> <a href="javascript:void(0)" data-action="manage" data-id="${n.ID}" style="color:var(--kp-cyan)">${n.Name}</a></div>`:""}
                </div>
                ${s?"":P(e.SiteStatus)}
            </div>
            <div class="kp-site-actions">
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="manage" data-id="${e.ID}" uk-tooltip="Manage This Site"><span uk-icon="icon: cog;"></span></button>
                ${s?"":`
                ${e.SiteStatus===1?`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="stop" data-id="${e.ID}" uk-tooltip="Stop the Site"><span uk-icon="icon: ban;"></span></button>`:`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="start" data-id="${e.ID}" uk-tooltip="Start the Site"><span uk-icon="icon: play;"></span></button>`}
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="restart" data-id="${e.ID}" uk-tooltip="Restart the Site"><span uk-icon="icon: refresh;"></span></button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="flush" data-id="${e.ID}" title="Flush cache" uk-tooltip="Flush the Caches"><span uk-icon="icon: bolt;"></span></button>
                <div class="kp-site-actions-break"></div>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="recreate" data-id="${e.ID}" title="Recreate pod" uk-tooltip="Recreate the Pod"><span uk-icon="icon: history;"></span></button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="clone" data-id="${e.ID}" data-name="${e.Name}" uk-tooltip="Clone"><span uk-icon="icon: move;"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit" data-id="${e.ID}" title="Edit" uk-tooltip="Edit the Site"><span uk-icon="icon: pencil;"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="delete" data-id="${e.ID}" title="Delete" uk-tooltip="Delete the Site"><span uk-icon="icon: trash;"></span></button>
            </div>
        </div>`}function Me(){let e=document.getElementById("sites-bulk-bar"),t=document.getElementById("sites-bulk-count"),a=document.getElementById("sites-select-all"),s=document.getElementById("sites-search"),n=document.querySelector(".kp-table-wrap tbody");if(!e||!a)return;let o=null,i=!0,r=()=>[...document.querySelectorAll(".kp-site-row-check:checked")],c=()=>{let m=r().length;t.textContent=`${m} selected`,["bulk-start","bulk-stop","bulk-restart","bulk-flush"].forEach(g=>{let h=document.getElementById(g);h&&(h.disabled=m===0)});let b=document.querySelectorAll(".kp-site-row-check");a.indeterminate=m>0&&m<b.length,a.checked=b.length>0&&m===b.length},k=()=>{let u=s.value.trim().toLowerCase();document.querySelectorAll(".kp-table-wrap tbody tr").forEach(m=>{let b=m.querySelector(".kp-site-row-name")?.textContent.toLowerCase()??"",g=m.querySelector("td:nth-child(6)")?.textContent.toLowerCase()??"";m.style.display=!u||b.includes(u)||g.includes(u)?"":"none"})},p=u=>{o===u?i=!i:(o=u,i=!0),document.querySelectorAll(".kp-sort-icon").forEach(b=>{b.dataset.col===u?b.textContent=i?" \u2191":" \u2193":b.textContent=" \u2195"});let m=[...n.querySelectorAll("tr")];m.sort((b,g)=>{let h="",f="";return u==="name"?(h=b.querySelector(".kp-site-row-name")?.textContent??"",f=g.querySelector(".kp-site-row-name")?.textContent??""):u==="status"?(h=b.dataset.status??"",f=g.dataset.status??""):u==="type"?(h=b.dataset.type??"",f=g.dataset.type??""):u==="domain"&&(h=b.querySelector("td:nth-child(6)")?.textContent.trim()??"",f=g.querySelector("td:nth-child(6)")?.textContent.trim()??""),i?h.localeCompare(f):f.localeCompare(h)}),m.forEach(b=>n.appendChild(b))};a.addEventListener("change",()=>{document.querySelectorAll(".kp-site-row-check").forEach(u=>{u.checked=a.checked}),c()}),n?.addEventListener("change",u=>{u.target.classList.contains("kp-site-row-check")&&c()}),s?.addEventListener("input",k),document.querySelectorAll(".kp-sortable").forEach(u=>{u.addEventListener("click",()=>p(u.dataset.col))}),["bulk-start","bulk-stop","bulk-restart","bulk-flush"].forEach(u=>{let m=u.replace("bulk-","");document.getElementById(u)?.addEventListener("click",()=>{let b=r().map(g=>g.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:m,ids:b}}))})}),document.querySelectorAll(".kp-sort-icon").forEach(u=>{u.textContent=" \u2195"}),c()}async function ie(e){let t=await d.get("/sites")??[],a=t.filter(o=>o.SiteStatus===1).length,s=t.filter(o=>o.SiteStatus===2).length,n=t.filter(o=>o.SiteStatus===4).length;e.innerHTML=`
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
                            <div class="kp-stat-value" style="color:var(--kp-success)">${a}</div>
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
                            <div class="kp-stat-value" style="color:var(--kp-text-dim)">${s}</div>
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
                            <div class="kp-stat-value" style="color:var(--kp-danger)">${n}</div>
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
            ${t.length===0?F("world","No sites yet"):t.slice(-3).reverse().map(o=>oe(o,t)).join("")}
        </div>`,document.getElementById("dash-new-site")?.addEventListener("click",()=>W())}function M(e=null){let t=e?`/sites/${e}/security/ip`:"/security/ip",a=e?`/sites/${e}/security/ua`:"/security/ua",s=e?`/sites/${e}/waf`:"/settings/waf";return`
        <div id="security-panel" data-ip-base="${t}" data-ua-base="${a}" data-waf-base="${s}" ${e?`data-site-id="${e}"`:""}>

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
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api${a}/export" download="${e?`site-${e}-ua-rules.csv`:"podnest-global-ua-rules.csv"}" uk-tooltip="Export UA rules as CSV">
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

        </div>`}async function T(e){let t=e.querySelector("#security-panel");if(!t)return;let a=t.dataset.ipBase,s=t.dataset.uaBase,n=t.dataset.wafBase;try{let o=[d.get(a),d.get(s)];t.dataset.siteId||o.push(d.get(n),d.get("/settings/trusted-proxies"));let[i,r,c,k]=await Promise.all(o);if(!e.querySelector("#sec-ip-whitelist"))return;if(e.querySelector("#sec-ip-whitelist").value=i.whitelist??"",e.querySelector("#sec-ip-blacklist").value=i.blacklist??"",e.querySelector("#sec-ua-whitelist").value=r.whitelist??"",e.querySelector("#sec-ua-blacklist").value=r.blacklist??"",c){let p=e.querySelector("#sec-waf-enabled"),u=e.querySelector("#sec-waf-audit"),m=e.querySelector("#sec-waf-mode"),b=e.querySelector("#sec-waf-paranoia"),g=e.querySelector("#sec-waf-exclusions");p&&(p.checked=!!c.Enabled),u&&(u.checked=!!c.AuditLog),m&&(m.value=String(c.Mode??0)),b&&(b.value=String(c.ParanoiaLevel??1)),g&&(g.value=c.Exclusions??"")}if(k){let p=e.querySelector("#sec-tp-cidrs");p&&(p.value=k.trusted_proxies_custom??"")}}catch(o){l.error("Failed to load security rules: "+o.message)}}function O(e){let t=e.querySelector("#security-panel");if(!t)return;let a=t.dataset.ipBase,s=t.dataset.uaBase;e.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let n=e.querySelector("#sec-ip-save"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(a,{whitelist:e.querySelector("#sec-ip-whitelist").value,blacklist:e.querySelector("#sec-ip-blacklist").value}),l.success("IP rules saved")}catch(i){l.error(i.message)}finally{n.disabled=!1,n.innerHTML=o}}),e.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let n=e.querySelector("#sec-ua-save"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(s,{whitelist:e.querySelector("#sec-ua-whitelist").value,blacklist:e.querySelector("#sec-ua-blacklist").value}),l.success("UA rules saved")}catch(i){l.error(i.message)}finally{n.disabled=!1,n.innerHTML=o}}),e.querySelector("#sec-tp-save")?.addEventListener("click",async()=>{let n=e.querySelector("#sec-tp-save"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put("/settings/trusted-proxies",{trusted_proxies_custom:e.querySelector("#sec-tp-cidrs").value.trim()}),l.success("Trusted proxy ranges saved")}catch(i){l.error(i.message)}finally{n.disabled=!1,n.innerHTML=o}}),e.querySelector("#sec-tp-import")?.addEventListener("change",async n=>{let o=n.target.files[0];if(!o)return;let i=new FormData;i.append("file",o);try{let r=await fetch("/api/settings/trusted-proxies/import",{method:"POST",body:i}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await T(e),l.success("Trusted proxies imported")}catch(r){l.error(r.message)}finally{n.target.value=""}}),e.querySelector("#sec-waf-save")?.addEventListener("click",async()=>{let n=e.querySelector("#sec-waf-save"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(t.dataset.wafBase,{enabled:e.querySelector("#sec-waf-enabled").checked,mode:parseInt(e.querySelector("#sec-waf-mode").value,10),paranoia_level:parseInt(e.querySelector("#sec-waf-paranoia").value,10),audit_log:e.querySelector("#sec-waf-audit").checked,exclusions:e.querySelector("#sec-waf-exclusions").value.trim()}),l.success("WAF settings saved \u2014 engine recompiling in background")}catch(i){l.error(i.message)}finally{n.disabled=!1,n.innerHTML=o}}),e.querySelector("#sec-ip-import")?.addEventListener("change",async n=>{let o=n.target.files[0];if(!o)return;let i=new FormData;i.append("file",o);try{let r=await fetch("/api"+a+"/import",{method:"POST",body:i}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await T(e),l.success("IP rules imported")}catch(r){l.error(r.message)}finally{n.target.value=""}}),e.querySelector("#sec-ua-import")?.addEventListener("change",async n=>{let o=n.target.files[0];if(!o)return;let i=new FormData;i.append("file",o);try{let r=await fetch("/api"+s+"/import",{method:"POST",body:i}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await T(e),l.success("UA rules imported")}catch(r){l.error(r.message)}finally{n.target.value=""}}),e.querySelector("#sec-waf-import")?.addEventListener("change",async n=>{let o=n.target.files[0];if(!o)return;let i=new FormData;i.append("file",o);try{let r=await fetch("/api/settings/waf/import",{method:"POST",body:i}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await T(e),l.success("WAF settings imported")}catch(r){l.error(r.message)}finally{n.target.value=""}})}async function le(e){if(!B()){e.innerHTML=L("Access denied");return}e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 a blacklisted entry cannot be overridden by any whitelist.
        </p>
        ${M(null)}`,O(e),T(e)}function Re(e){switch(e){case"valid":case"self-signed":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function re(e){let t=document.getElementById("admin-domain-ssl");if(!(!t||!e))try{let a=await d.get(`/ssl-status?domain=${encodeURIComponent(e)}`);t.outerHTML=Re(a.status)}catch{}}async function ce(e){if(!B()){e.innerHTML=L("Access denied");return}let[t,a,s,n]=await Promise.all([d.get("/settings"),d.get("/settings/backup"),d.get("/settings/waf"),d.get("/settings/trusted-proxies")]);e.innerHTML=`
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
                            value="${a.backup_schedule??""}">
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
                            value="${a.backup_retain_days??"30"}">
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
                            value="${a.s3_endpoint??""}">
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
                            value="${a.s3_bucket??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-region">Region</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-region"
                            name="s3_region"
                            type="text"
                            placeholder="us-east-1"
                            value="${a.s3_region??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-access-key">Access Key ID</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-access-key"
                            name="s3_access_key"
                            type="text"
                            placeholder="AKIAIOSFODNN7EXAMPLE"
                            value="${a.s3_access_key??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-secret-key">Secret Access Key</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-secret-key"
                            name="s3_secret_key"
                            type="password"
                            placeholder="${a.s3_secret_key?"saved \u2014 enter new value to change":"enter secret key"}"
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
    `,t.admin_domain&&re(t.admin_domain),document.getElementById("settings-form").addEventListener("submit",async o=>{o.preventDefault();let i=o.target.querySelector('[type="submit"]'),r=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let k={admin_domain:new FormData(o.target).get("admin_domain").trim()};try{await d.put("/settings",k),l.success("Settings saved"),re(k.admin_domain)}catch(p){l.error(p.message)}finally{i.disabled=!1,i.innerHTML=r}}),document.getElementById("settings-import").addEventListener("change",async o=>{let i=o.target.files[0];if(!i)return;let r=new FormData;r.append("file",i);try{let c=await fetch("/api/settings/import",{method:"POST",body:r}),k=c.status===204?null:await c.json().catch(()=>null);if(!c.ok)throw new Error(k?.error||`HTTP ${c.status}`);l.success("Settings imported")}catch(c){l.error(c.message)}finally{o.target.value=""}}),document.getElementById("backup-form").addEventListener("submit",async o=>{o.preventDefault();let i=o.target.querySelector('[type="submit"]'),r=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let c=new FormData(o.target),k={backup_schedule:c.get("backup_schedule").trim(),backup_retain_days:c.get("backup_retain_days").trim()};try{await d.put("/settings/backup",k),l.success("Backup settings saved")}catch(p){l.error(p.message)}finally{i.disabled=!1,i.innerHTML=r}}),document.getElementById("s3-form").addEventListener("submit",async o=>{o.preventDefault();let i=o.target.querySelector('[type="submit"]'),r=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let c=new FormData(o.target),k={s3_endpoint:c.get("s3_endpoint").trim(),s3_bucket:c.get("s3_bucket").trim(),s3_region:c.get("s3_region").trim(),s3_access_key:c.get("s3_access_key").trim()},p=c.get("s3_secret_key").trim();p&&(k.s3_secret_key=p);try{await d.put("/settings/backup",k),l.success("S3 settings saved")}catch(u){l.error(u.message)}finally{i.disabled=!1,i.innerHTML=r}})}function de(e){return`
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

        </div>`}function He(e){if(!e||e.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>';let t=n=>n===2?'<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>':'<span class="kp-mono" style="color:var(--kp-blue)">Local</span>',a=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:n<1073741824?`${(n/1048576).toFixed(1)} MB`:`${(n/1073741824).toFixed(2)} GB`;return`
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
            <tbody>${e.map(n=>`
        <tr>
            <td class="kp-mono" style="font-size:0.8rem">${n.SnapshotID}</td>
            <td>${n.Label||"\u2014"}</td>
            <td>${t(n.BackupType)}</td>
            <td>${a(n.SizeBytes)}</td>
            <td>${new Date(n.Created).toLocaleString()}</td>
            <td>
                <div class="uk-flex" style="gap:6px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm backup-download-btn"
                        data-id="${n.ID}" uk-tooltip="Download backup archive">
                        <span uk-icon="download"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm backup-restore-btn"
                        data-id="${n.ID}" uk-tooltip="Restore from this snapshot">
                        <span uk-icon="history"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm backup-delete-btn"
                        data-id="${n.ID}" uk-tooltip="Delete this snapshot">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("")}</tbody>
        </table>`}async function R(e,t){try{let[a,s]=await Promise.all([d.get(`/sites/${t}/backup-repo`),d.get(`/sites/${t}/backups`)]),n=e.querySelector("#backup-local-enabled"),o=e.querySelector("#backup-s3-enabled");n&&(n.checked=!!a.LocalEnabled),o&&(o.checked=!!a.S3Enabled);let i=e.querySelector("#backup-error-banner");if(i)if(a.last_error){let c=a.last_error_at?` (${new Date(a.last_error_at).toLocaleString()})`:"";i.innerHTML=`
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${c}:</strong> ${a.last_error}</p>
                    </div>`}else i.innerHTML="";let r=e.querySelector("#backup-list-wrap");r&&(r.innerHTML=He(s))}catch(a){let s=e.querySelector("#backup-list-wrap");s&&(s.innerHTML=`<p class="kp-muted uk-text-small">Failed to load backups: ${a.message}</p>`)}}function ue(e,t){e.querySelector("#backup-repo-save")?.addEventListener("click",async()=>{let a={local_enabled:e.querySelector("#backup-local-enabled")?.checked??!1,s3_enabled:e.querySelector("#backup-s3-enabled")?.checked??!1};try{await d.put(`/sites/${t}/backup-repo`,a),l.success("Backup destinations saved")}catch(s){l.error(s.message)}}),e.querySelector("#backup-run-btn")?.addEventListener("click",async()=>{let a=0;try{a=(await d.get(`/sites/${t}/backups`))?.length??0}catch{}try{await d.post(`/sites/${t}/backups`,{label:"manual"})}catch(o){l.error(o.message);return}x("Backup Running","Snapshotting files and database \u2014 this may take a few minutes.");let s=Date.now()+1800*1e3,n=setInterval(async()=>{try{(((await d.get(`/sites/${t}/backups`))?.length??0)>a||Date.now()>s)&&(clearInterval(n),y(),await R(e,t),Date.now()<=s?l.success("Backup complete"):l.error("Backup is taking longer than expected \u2014 check server logs for status"))}catch{}},4e3)}),e.querySelector("#backup-list-wrap")?.addEventListener("click",async a=>{let s=a.target.closest(".backup-restore-btn");if(s){let i=s.dataset.id;if(!await $("Restore Site","This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"))return;try{await d.post(`/sites/${t}/backups/${i}/restore`)}catch(u){l.error(u.message);return}x("Restore Running","Restoring files and database \u2014 the site will return automatically when complete.");let c=Date.now(),k=Date.now()+900*1e3,p=setInterval(async()=>{try{let u=await d.get(`/sites/${t}/backups/restore-status`);(!u?.active||Date.now()>k)&&(clearInterval(p),y(),u?.active?l.error("Restore timed out"):l.success("Restore complete"),await R(e,t))}catch{}},3e3);return}let n=a.target.closest(".backup-delete-btn");if(n){let i=n.dataset.id;if(!await $("Delete Snapshot","This will permanently remove the snapshot from all configured repositories. This cannot be undone."))return;x("Deleting Snapshot","Removing snapshot data from repositories \u2014 this may take a moment.");try{await d.delete(`/sites/${t}/backups/${i}`),y(),l.success("Snapshot deleted"),await R(e,t)}catch(c){y(),l.error(c.message)}}let o=a.target.closest(".backup-download-btn");if(o){let i=o.dataset.id;x("Preparing Download","Your backup archive is being generated \u2014 this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."),setTimeout(()=>{let r=document.createElement("a");r.href=`/api/sites/${t}/backups/${i}/download`,r.style.display="none",document.body.appendChild(r),r.click(),document.body.removeChild(r),setTimeout(()=>{y()},5e3)},300);return}})}var V={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis",5:"Varnish"};function A(e,t,a){let s=a?Object.entries(a):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <span class="kp-muted uk-text-small">${s.length} configuration keys</span>
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
                ${s.map(([n,o])=>H(n,o)).join("")}
            </div>
        </div>`}function pe(e,t){let a=t?.enabled==="true",s=t?Object.entries(t).filter(([n])=>n!=="enabled"):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom" uk-tooltip="Add a Key">
                <span class="kp-muted uk-text-small">${s.length} configuration keys</span>
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
                    <input type="checkbox" class="uk-checkbox varnish-enabled-toggle" ${a?"checked":""}>
                    <span>Enable Varnish Cache</span>
                    <span class="kp-muted uk-text-small">\u2014 requires pod recreate to take effect</span>
                </label>
            </div>

            <div class="kp-config-grid cfg-rows" data-type="5">
                ${s.map(([n,o])=>H(n,o)).join("")}
            </div>
        </div>`}function H(e="",t=""){return`<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${e}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${t}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function ke(e,t){e.addEventListener("click",a=>{if(a.target.closest(".cfg-add-row")){let s=a.target.closest(".cfg-add-row");e.querySelector(`.cfg-rows[data-type="${s.dataset.type}"]`).insertAdjacentHTML("beforeend",H())}}),e.addEventListener("click",a=>{a.target.closest(".cfg-del-row")&&a.target.closest(".kp-config-row").remove()}),e.addEventListener("click",async a=>{let s=a.target.closest(".cfg-save");if(!s)return;let{type:n,site:o}=s.dataset,i=e.querySelectorAll(`.cfg-rows[data-type="${n}"] .kp-config-row`),r={};if(i.forEach(c=>{let k=c.querySelector(".cfg-key").value.trim(),p=c.querySelector(".cfg-val").value.trim();k&&(r[k]=p)}),n==="5"){let c=e.querySelector(".varnish-enabled-toggle");r.enabled=c?.checked?"true":"false"}try{await d.put(`/sites/${o}/configs/${n}`,r),l.success(`${V[n]} config saved`)}catch(c){l.error(c.message)}}),e.addEventListener("click",async a=>{let s=a.target.closest(".cfg-reset");if(!s)return;let{type:n,site:o}=s.dataset;if(await $("Reset Config",`Reset ${V[n]} config to defaults?`))try{let r=await d.post(`/sites/${o}/configs/${n}/reset`),c=e.querySelector(`.cfg-rows[data-type="${n}"]`);c.innerHTML=Object.entries(r).map(([k,p])=>H(k,p)).join(""),l.success(`${V[n]} reset to defaults`)}catch(r){l.error(r.message)}}),e.addEventListener("change",async a=>{let s=a.target.closest(".cfg-import-input");if(!s)return;let{type:n,site:o}=s.dataset,i=s.files[0];if(!i)return;let r=new FormData;r.append("file",i);try{let c=await fetch(`/api/sites/${o}/configs/${n}/import`,{method:"POST",body:r}),k=c.status===204?null:await c.json().catch(()=>null);if(!c.ok)throw new Error(k?.error||`HTTP ${c.status}`);let p=e.querySelector(`.cfg-rows[data-type="${n}"]`);p.innerHTML=Object.entries(k).map(([u,m])=>H(u,m)).join(""),l.success(`${V[n]} config imported`)}catch(c){l.error(c.message)}finally{s.value=""}})}function be(e){return`
        <div id="crons-panel" data-site-id="${e}">
            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Cron Jobs</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="cron-add-btn" uk-tooltip="Add Cron Job">
                        <span uk-icon="plus"></span>
                    </button>
                </div>
                <div id="cron-list-wrap">
                    <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
                </div>
            </div>

            <!-- add / edit modal -->
            <div id="cron-modal" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title" id="cron-modal-title">Add Cron Job</h3>
                    <div class="uk-form-stacked uk-margin-top">
                        <div class="uk-grid-small" uk-grid>
                            <input type="hidden" id="cron-modal-id">
                            <div class="uk-width-1-1">
                                <label class="kp-label">Label</label>
                                <input class="uk-input kp-input" type="text" id="cron-modal-label" placeholder="e.g. Daily cleanup">
                            </div>
                            <div class="uk-width-1-1">
                                <label class="kp-label">Command</label>
                                <textarea class="uk-textarea kp-textarea kp-mono" id="cron-modal-command" rows="3"
                                    placeholder="e.g. php /var/www/html/artisan schedule:run"></textarea>
                            </div>
                            <div class="uk-width-1-1">
                                <label class="kp-label">Schedule <span class="kp-muted uk-text-small">(5-field cron expression)</span></label>
                                <input class="uk-input kp-input kp-mono" type="text" id="cron-modal-schedule" placeholder="e.g. 0 3 * * *">
                                <p class="kp-muted uk-text-small uk-margin-small-top uk-margin-remove-bottom" id="cron-schedule-preview"></p>
                            </div>
                            <div class="uk-width-1-1">
                                <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                                    <input type="checkbox" class="uk-checkbox" id="cron-modal-enabled" checked>
                                    <span class="kp-text">Enabled</span>
                                </label>
                            </div>
                        </div>
                        <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                            <button class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                            <button class="uk-button kp-btn-primary" id="cron-modal-save">Save</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>`}function ge(e){if(!e||e.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No cron jobs configured.</p>';let t=s=>s?new Date(s).toLocaleString():"\u2014";return`
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead>
                <tr>
                    <th>Label</th>
                    <th>Schedule</th>
                    <th>Last Run</th>
                    <th>Status</th>
                    <th>Enabled</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${e.map(s=>`
        <tr>
            <td class="kp-text">${s.Label||'<span class="kp-muted">\u2014</span>'}</td>
            <td class="kp-mono kp-text-sm">${s.Schedule}</td>
            <td class="kp-muted uk-text-small">${t(s.LastRun)}</td>
            <td>
                ${s.LastError?'<span class="kp-badge kp-badge-error">Error</span>':s.LastRun?'<span class="kp-badge kp-badge-success">OK</span>':'<span class="kp-muted uk-text-small">\u2014</span>'}
                ${s.LastOutput||s.LastError?`<a class="kp-cron-detail-btn cron-detail-btn" data-id="${s.ID}" uk-tooltip="View Run Details">
                            <span uk-icon="icon: info; ratio: 0.75"></span>
                        </a>`:""}
            </td>
            <td>
                <input type="checkbox" class="uk-checkbox cron-toggle"
                    data-id="${s.ID}" ${s.Enabled?"checked":""}>
            </td>
            <td>
                <div class="uk-flex kp-cron-actions">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cron-run-btn"
                        data-id="${s.ID}" uk-tooltip="Run Now">
                        <span uk-icon="play"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cron-edit-btn"
                        data-id="${s.ID}" uk-tooltip="Edit">
                        <span uk-icon="pencil"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm cron-delete-btn"
                        data-id="${s.ID}" uk-tooltip="Delete">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("")}</tbody>
        </table>`}async function z(e,t){let a=e.querySelector("#cron-list-wrap");if(a)try{let s=await d.get(`/sites/${t}/crons`);a.innerHTML=ge(s)}catch(s){a.innerHTML=`<p class="kp-muted uk-text-small">Failed to load cron jobs: ${s.message}</p>`}}function ve(e,t){let a=[],s=e.querySelector("#cron-modal"),n=e.querySelector("#cron-modal-title"),o=e.querySelector("#cron-modal-id"),i=e.querySelector("#cron-modal-label"),r=e.querySelector("#cron-modal-command"),c=e.querySelector("#cron-modal-schedule"),k=e.querySelector("#cron-schedule-preview"),p=e.querySelector("#cron-modal-enabled");c?.addEventListener("input",()=>{k.textContent=me(c.value.trim())}),e.querySelector("#cron-add-btn")?.addEventListener("click",()=>{n.textContent="Add Cron Job",o.value="",i.value="",r.value="",c.value="",k.textContent="",p.checked=!0,UIkit.modal(s).show()}),e.querySelector("#cron-modal-save")?.addEventListener("click",async()=>{let u=r.value.trim(),m=c.value.trim();if(!u||!m){l.error("Command and schedule are required");return}let b={label:i.value.trim(),command:u,schedule:m,enabled:p.checked},g=o.value;try{g?(await d.put(`/sites/${t}/crons/${g}`,b),l.success("Cron job updated")):(await d.post(`/sites/${t}/crons`,b),l.success("Cron job created")),UIkit.modal(s).hide(),await z(e,t),a=await d.get(`/sites/${t}/crons`)}catch(h){l.error(h.message)}}),e.querySelector("#cron-list-wrap")?.addEventListener("click",async u=>{let m=u.target.closest(".cron-detail-btn");if(m){let f=m.dataset.id,w=a.find(G=>String(G.ID)===f);if(!w)return;document.body.insertAdjacentHTML("beforeend",`
                <div id="cron-detail-modal" uk-modal>
                    <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                        <button class="uk-modal-close-default" type="button" uk-close></button>
                        <h3 class="kp-view-title uk-margin-bottom">Run Details \u2014 ${Z(w.Label||String(w.ID))}</h3>
                        <div class="uk-margin-small-bottom">
                            <label class="kp-label">Output</label>
                            <pre class="kp-cron-output">${Z(w.LastOutput||"(no output)")}</pre>
                        </div>
                        <div class="uk-margin-small-top">
                            <label class="kp-label">Error</label>
                            <pre class="kp-cron-output kp-cron-output-error">${Z(w.LastError||"(no error)")}</pre>
                        </div>
                    </div>
                </div>`);let S=document.getElementById("cron-detail-modal");UIkit.modal(S).show(),S.addEventListener("hidden",()=>S.remove(),{once:!0});return}let b=u.target.closest(".cron-edit-btn");if(b){let f=b.dataset.id,w=a.find(S=>String(S.ID)===f);if(!w)return;n.textContent="Edit Cron Job",o.value=w.ID,i.value=w.Label||"",r.value=w.Command,c.value=w.Schedule,k.textContent=me(w.Schedule),p.checked=w.Enabled,UIkit.modal(s).show();return}let g=u.target.closest(".cron-delete-btn");if(g){let f=g.dataset.id;if(!await $("Delete Cron Job","This will permanently remove the cron job. Continue?"))return;try{await d.delete(`/sites/${t}/crons/${f}`),l.success("Cron job deleted"),await z(e,t),a=await d.get(`/sites/${t}/crons`)}catch(S){l.error(S.message)}return}let h=u.target.closest(".cron-run-btn");if(h){let f=h.dataset.id;try{await d.post(`/sites/${t}/crons/${f}/run`)}catch(E){l.error(E.message);return}x("Running Cron Job","Executing the job inside the container \u2014 please wait.");let w=null;try{w=(await d.get(`/sites/${t}/crons`)).find(I=>String(I.ID)===f)?.LastRun??null}catch{}let S=Date.now()+300*1e3,G=setInterval(async()=>{try{let E=await d.get(`/sites/${t}/crons`),I=E.find(N=>String(N.ID)===f);if(!I||I.LastRun!==w||Date.now()>S){clearInterval(G),y(),a=E??[];let N=e.querySelector("#cron-list-wrap");N&&(N.innerHTML=ge(E)),I?.LastError?l.error(`Job failed: ${I.LastError}`):l.success("Cron job complete")}}catch{}},2e3);return}}),e.querySelector("#cron-list-wrap")?.addEventListener("change",async u=>{let m=u.target.closest(".cron-toggle");if(!m)return;let b=m.dataset.id;try{await d.patch(`/sites/${t}/crons/${b}/toggle`,{enabled:m.checked}),l.success(m.checked?"Cron job enabled":"Cron job disabled")}catch(g){l.error(g.message),m.checked=!m.checked}}),d.get(`/sites/${t}/crons`).then(u=>{a=u??[]}).catch(()=>{})}function Z(e){return String(e).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function me(e){if(!e)return"";let t=e.trim().split(/\s+/);if(t.length!==5)return"invalid expression";let[a,s,n,o,i]=t;if(e==="* * * * *")return"every minute";if(a!=="*"&&s!=="*"&&n==="*"&&o==="*"&&i==="*")return`daily at ${s.padStart(2,"0")}:${a.padStart(2,"0")}`;if(a!=="*"&&s!=="*"&&n==="*"&&o==="*"&&i!=="*"){let r=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return`weekly on ${i.split(",").map(k=>r[parseInt(k)]??k).join(", ")} at ${s.padStart(2,"0")}:${a.padStart(2,"0")}`}return a.startsWith("*/")?`every ${a.slice(2)} minutes`:s.startsWith("*/")?`every ${s.slice(2)} hours`:e}function ee(e,t){return`
        <div>
            <div class="kp-log-controls">
                <select class="uk-select kp-select" id="log-container" style="width:140px;height:38px">
                    ${t===6?'<option value="waf">WAF Log</option>':`<option value="nginx">Nginx</option>
                    ${(()=>{switch(t){case 1:case 2:return'<option value="php">PHP-FPM</option>';case 4:return'<option value="app">Node.js</option>';case 5:return'<option value="app">.NET</option>';default:return""}})()}
                    <option value="db">MariaDB</option>
                    <option value="redis">Redis</option>
                    <option value="waf">WAF Log</option>`}
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
        </div>`}function he(e,t){let a=null,s=!1,n=e.querySelector("#log-output"),o=e.querySelector("#log-connect"),i=e.querySelector("#log-disconnect"),r=e.querySelector("#log-clear"),c=e.querySelector("#log-autoscroll"),k=e.querySelector("#log-status");function p(b){b.split(`
`).forEach(g=>{if(!g)return;let h=document.createElement("div");h.className=g.match(/WAF BLOCK/i)?"kp-log-line-err":g.match(/WAF DETECT/i)?"kp-log-line-warn":g.match(/error|crit|emerg/i)?"kp-log-line-err":g.match(/warn/i)?"kp-log-line-warn":g.match(/info|notice/i)?"kp-log-line-info":"",h.textContent=g,n.appendChild(h)}),c.checked&&(n.scrollTop=n.scrollHeight)}function u(){a&&(a.close(),a=null),s=!1,o.disabled=!1,i.disabled=!0,k&&(k.textContent="Disconnected")}o.addEventListener("click",()=>{u();let b=e.querySelector("#log-container").value,g=e.querySelector("#log-tail").value,h=location.protocol==="https:"?"wss":"ws",f=b==="waf"?`${h}://${location.host}/api/sites/${t}/logs/waf?tail=${g}`:`${h}://${location.host}/api/sites/${t}/logs?container=${b}&tail=${g}`;a=new WebSocket(f),a.onopen=()=>{s=!0,o.disabled=!0,i.disabled=!1,k&&(k.textContent=`Connected \u2014 ${b}`)},a.onmessage=w=>p(w.data),a.onerror=()=>{},a.onclose=()=>{s=!1,o.disabled=!1,i.disabled=!0,k&&(k.textContent="Disconnected")}}),i.addEventListener("click",u),r.addEventListener("click",()=>{n.innerHTML=""}),e.querySelector("#log-container").addEventListener("change",()=>{a&&a.readyState===WebSocket.OPEN&&(u(),o.click())});let m=v.go.bind(v);v.go=function(b,g={}){return a&&u(),m(b,g)}}function Ae(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function fe(e,t){try{let a=await d.get(`/ssl-status?domain=${encodeURIComponent(e)}`),s=document.getElementById(`ssl-icon-${t}`);s&&(s.outerHTML=Ae(a.status))}catch{}}function ye(e){e.forEach(t=>fe(t.Domain,t.ID))}function we(e,t,a,s=0,n=null){let o=e.SiteType!==3&&e.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${e.Name}</td></tr>
                            ${n?`<tr><td class="kp-muted">Parent</td><td><a href="javascript:void(0)" data-action="manage" data-id="${s}" style="color:var(--kp-cyan)">${n}</a></td></tr>`:""}
                            <tr><td class="kp-muted">Internal Port</td><td>:${e.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${q(e.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${C(e)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${P(e.SiteStatus)}</td></tr>
                            <tr><td class="kp-muted">Created</td><td>${new Date(e.Created).toLocaleString()}</td></tr>
                        </tbody>
                    </table>
                </div>
                
                ${n?`
                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">Site Sync</h3>
                    <p class="kp-muted uk-text-small uk-margin-remove-bottom">
                        Sync files and database between this clone and its parent site.
                    </p>
                    <div class="uk-flex uk-margin-small-top" style="gap:8px">
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="sync-pull-btn">
                            <span uk-icon="cloud-download"></span> Pull From Parent
                        </button>
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="sync-push-btn">
                            <span uk-icon="cloud-upload"></span> Push To Parent
                        </button>
                    </div>
                </div>`:""}

                ${o?`
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
                        ${t.length?t.map(xe).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
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
                            <tr><td class="kp-muted">User</td><td class="kp-mono">${a?.Username??e.Name}</td></tr>
                            <tr>
                                <td class="kp-muted">Password</td>
                                <td>
                                    <span id="sftp-pass-display" class="kp-mono kp-sftp-pass">${a?.Password??"\u2014"}</span>
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
        </div>`}function xe(e){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${e.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${e.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <span class="uk-text-small kp-mono">${e.Domain}</span>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${e.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function Se(e,t){e.querySelector("#domain-add-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.remove("uk-hidden")}),e.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.add("uk-hidden")}),e.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let a=e.querySelector("#domain-add-input").value.trim();if(a)try{let s=await d.post(`/sites/${t}/domains`,{domain:a});e.querySelector("#domain-list").insertAdjacentHTML("beforeend",xe(s)),fe(s.Domain,s.ID),e.querySelector("#domain-add-form").classList.add("uk-hidden"),e.querySelector("#domain-add-input").value="",l.success("Domain added")}catch(s){l.error(s.message)}}),e.querySelector("#domain-list")?.addEventListener("click",async a=>{let s=a.target.closest('[data-action="delete-domain"]');if(!(!s||!await $("Remove Domain","Remove this domain from the site?")))try{await d.delete(`/sites/${t}/domains/${s.dataset.did}`),s.closest("[data-domain-id]").remove(),l.success("Domain removed")}catch(o){l.error(o.message)}})}function $e(e,t,a=null){e.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#sftp-regen-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.post(`/sites/${t}/sftp-regen`),l.success("SFTP password regenerated"),v.go("site-detail",{id:String(t)})}catch(o){l.error(o.message),s.disabled=!1,s.innerHTML=n}}),e.querySelector("#sftp-copy-btn")?.addEventListener("click",()=>{let s=e.querySelector("#sftp-pass-display")?.textContent;if(s)if(navigator.clipboard)navigator.clipboard.writeText(s).then(()=>l.success("Password copied to clipboard")).catch(()=>l.error("Failed to copy password"));else{let n=document.createElement("textarea");n.value=s,n.style.cssText="position:fixed;opacity:0",document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n),l.success("Password copied to clipboard")}}),e.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#pma-open-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let o=await d.post(`/sites/${t}/pma-token`);window.open(o.url,"_blank")}catch(o){l.error(o.message)}finally{s.disabled=!1,s.innerHTML=n}}),e.querySelector("#sync-pull-btn")?.addEventListener("click",async()=>{if(await Y("pull",a.Name,e.querySelector('[data-action="manage"][data-id="'+a.ParentID+'"]')?.textContent?.trim()??"parent"))try{l.success("Pull from parent complete")}catch(n){l.error(n.message)}}),e.querySelector("#sync-push-btn")?.addEventListener("click",async()=>{if(await Y("push",a.Name,e.querySelector('[data-action="manage"][data-id="'+a.ParentID+'"]')?.textContent?.trim()??"parent"))try{l.success("Push to parent complete")}catch(n){l.error(n.message)}})}var _e=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function Ee(e){return`
        <div>
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${_e.map(t=>`
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
        </div>`}function Le(e,t){let a=e.querySelector("#wpcli-output"),s=e.querySelector("#wpcli-input"),n=e.querySelector("#wpcli-run"),o=e.querySelector("#wpcli-clear"),i=e.querySelector("#wpcli-status"),r=[],c=-1;function k(m,b=""){m.split(`
`).forEach(g=>{if(!g)return;let h=document.createElement("div");b?h.className=b:h.className=g.match(/error|fatal|critical/i)?"kp-log-line-err":g.match(/warning|warn/i)?"kp-log-line-warn":g.match(/success|done\]/i)?"kp-log-line-info":"",h.textContent=g,a.appendChild(h)}),a.scrollTop=a.scrollHeight}function p(m){if(m=m.trim(),!m)return;r.unshift(m),c=-1,k(`wp> ${m}`,"kp-log-line-info"),s.disabled=!0,n.disabled=!0,i&&(i.textContent="Running...");let b=location.protocol==="https:"?"wss":"ws",g=new WebSocket(`${b}://${location.host}/api/sites/${t}/wpcli`);g.onopen=()=>{g.send(JSON.stringify({command:m}))},g.onmessage=h=>{let f=h.data;if(f.trim()==="[done]"){g.close();return}if(f.startsWith("[info]")){k(f,"kp-muted");return}if(f.startsWith("[error]")){k(f,"kp-log-line-err");return}k(f)},g.onerror=()=>{k("[error] WebSocket connection failed","kp-log-line-err")},g.onclose=()=>{s.disabled=!1,n.disabled=!1,i&&(i.textContent="Ready"),s.focus()}}n.addEventListener("click",()=>{p(s.value),s.value=""}),s.addEventListener("keydown",m=>{if(m.key==="Enter"){p(s.value),s.value="",c=-1;return}if(m.key==="ArrowUp"){m.preventDefault(),c<r.length-1&&(c++,s.value=r[c]);return}m.key==="ArrowDown"&&(m.preventDefault(),c>0?(c--,s.value=r[c]):(c=-1,s.value=""))}),e.querySelectorAll('[data-action="wpcli-quick"]').forEach(m=>{m.addEventListener("click",()=>{let b=m.dataset.cmd;if(b.startsWith("search-replace")){s.value=b,s.focus();let g=b.indexOf("''")+1;s.setSelectionRange(g,g);return}p(b)})}),o.addEventListener("click",()=>{a.innerHTML=""});let u=v.go.bind(v);v.go=function(m,b={}){return u(m,b)},s.focus()}var _=null;function Ne(){return`
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
        </div>`}function Fe(e){let t=e.querySelector(".kp-tab-bar");if(!t)return;let a=Array.from(t.querySelectorAll(":scope > li > a"));if(!a.length)return;let s=document.createElement("div");s.className="kp-tab-select-wrap",s.innerHTML='<span uk-icon="chevron-down"></span>';let n=document.createElement("select");n.className="kp-tab-select",a.forEach((o,i)=>{let r=document.createElement("option");r.value=i,r.textContent=o.textContent.trim(),n.appendChild(r)}),s.insertBefore(n,s.firstChild),t.parentNode.insertBefore(s,t),n.addEventListener("change",()=>{UIkit.tab(t).show(parseInt(n.value,10))}),UIkit.util.on(t,"shown",o=>{let i=o.target,c=Array.from(t.querySelectorAll(":scope > li")).indexOf(i);c!==-1&&(n.value=c)})}async function Te(e){let t=document.getElementById("waf-tab-panel");if(!t)return;t.innerHTML=Ne();let a=document.getElementById("waf-export-btn");a&&(a.href=`/api/sites/${e}/waf/export`);try{let s=await d.get(`/sites/${e}/waf`),n=document.getElementById("waf-override"),o=document.getElementById("waf-site-exclusions");n&&(n.value=String(s.Override??0)),o&&(o.value=s.Exclusions??"");let i=document.getElementById("waf-plugins-list");if(i){let[r,c]=await Promise.all([d.get("/settings/waf/plugins"),d.get(`/sites/${e}/waf/plugins`)]),k=new Set(c??[]);!r||r.length===0?i.innerHTML='<span class="kp-muted uk-text-small">No plugins found in local CRS install.</span>':(i.innerHTML=`
                    <div class="waf-plugin-pills">
                        ${r.map(p=>`
                        <span class="waf-plugin-pill ${k.has(p)?"active":""}"
                            data-plugin="${p}">${p}</span>
                        `).join("")}
                    </div>`,i.querySelectorAll(".waf-plugin-pill").forEach(p=>{p.addEventListener("click",()=>p.classList.toggle("active"))}))}}catch(s){l.error("Failed to load WAF settings: "+s.message)}}function Ue(e,t){_&&_.abort(),_=new AbortController,e.addEventListener("submit",async a=>{if(a.target.id!=="waf-override-form")return;a.preventDefault();let s=a.target.querySelector('[type="submit"]'),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let o=new FormData(a.target),i={override:parseInt(o.get("override"),10),exclusions:o.get("exclusions").trim()};try{await d.put(`/sites/${t}/waf`,i);let r=[...document.querySelectorAll(".waf-plugin-pill.active")].map(c=>c.dataset.plugin);await d.put(`/sites/${t}/waf/plugins`,r),l.success("WAF override saved \u2014 engine recompiling in background")}catch(r){l.error(r.message)}finally{s.disabled=!1,s.innerHTML=n}},{signal:_.signal}),e.querySelector("#waf-import")?.addEventListener("change",async a=>{let s=a.target.files[0];if(!s)return;let n=new FormData;n.append("file",s);try{let o=await fetch(`/api/sites/${t}/waf/import`,{method:"POST",body:n}),i=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(i?.error||`HTTP ${o.status}`);await Te(t),l.success("WAF settings imported")}catch(o){l.error(o.message)}finally{a.target.value=""}})}function je(){return`
        <div class="kp-card uk-padding uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">Upstream Routes</h3>
            <p class="kp-muted uk-text-small uk-margin-bottom">
                Each domain maps to one or more upstream URLs. Multiple upstreams for the same
                domain are load-balanced via round-robin.
            </p>
            <div id="rp-routes-list"></div>
            <button class="uk-button kp-btn-ghost uk-margin-small-top" id="rp-add-row">
                <span uk-icon="plus"></span> Add Route
            </button>
            <div class="uk-flex uk-flex-right uk-margin-top">
                <button class="uk-button kp-btn-primary" id="rp-save-btn">
                    <span uk-icon="check"></span> Save Routes
                </button>
            </div>
        </div>`}function te(e="",t=""){return`
        <div class="rp-route-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <input class="uk-input kp-input" style="flex:1" placeholder="example.com" value="${e}" data-field="domain">
            <input class="uk-input kp-input" style="flex:2" placeholder="https://10.0.0.1:8080" value="${t}" data-field="upstream">
            <button class="uk-button kp-btn-ghost kp-btn-sm rp-remove-row" uk-tooltip="Remove"><span uk-icon="trash"></span></button>
        </div>`}async function We(e){let t=document.getElementById("rp-routes-list");if(t)try{let a=await d.get(`/sites/${e}/rp-routes`);t.innerHTML=a.length?a.map(s=>te(s.Domain,s.Upstream)).join(""):te()}catch(a){l.error("Failed to load routes: "+a.message)}}function Oe(e,t){e.addEventListener("click",async a=>{if(a.target.closest("#rp-add-row")){document.getElementById("rp-routes-list").insertAdjacentHTML("beforeend",te());return}if(a.target.closest(".rp-remove-row")){a.target.closest(".rp-route-row").remove();return}if(!a.target.closest("#rp-save-btn"))return;let s=a.target.closest("#rp-save-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let o=[...document.querySelectorAll(".rp-route-row")].map(i=>({Domain:i.querySelector('[data-field="domain"]').value.trim(),Upstream:i.querySelector('[data-field="upstream"]').value.trim()})).filter(i=>i.Domain&&i.Upstream);try{await d.put(`/sites/${t}/rp-routes`,o),l.success("Routes saved")}catch(i){l.error(i.message)}finally{s.disabled=!1,s.innerHTML=n}},{signal:_.signal})}async function Pe(e,{id:t}){let[{site:a,domains:s,sftp:n},o,i]=await Promise.all([d.get(`/sites/${t}`),d.get("/sites"),d.get(`/sites/${t}/configs`)]),r=Array.isArray(o)?o:[],c=a.SiteType===1||a.SiteType===2,k=a.SiteType===6,p=[1,2,4,5].includes(a.SiteType);if(e.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <div class="kp-site-nav-wrap">
                    <select id="sd-site-nav" class="uk-select kp-select">
                        ${r.map(u=>`<option value="${u.ID}" ${u.ID===a.ID?"selected":""}>${u.Name}</option>`).join("")}
                    </select>
                    <span class="kp-site-nav-arrow">&#9660;</span>
                </div>
                ${k?"":P(a.SiteStatus)}
            </div>
            <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                ${k?"":`
                ${a.SiteStatus===1?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="stop" data-id="${t}" uk-tooltip="Stop the Site"><span uk-icon="ban"></span></button>`:`<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="start" data-id="${t}" uk-tooltip="Start the Site"><span uk-icon="play"></span></button>`}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="restart" data-id="${t}" uk-tooltip="Restart the Site"><span uk-icon="refresh"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="flush" data-id="${t}" uk-tooltip="Flush the Caches"><span uk-icon="bolt"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-recreate" uk-tooltip="Recreate &amp; Update the Pod"><span uk-icon="history"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-clone" uk-tooltip="Clone the Site"><span uk-icon="move"></span></button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-edit" uk-tooltip="Edit the Site"><span uk-icon="pencil"></span></button>
            </div>
        </div>
 
        ${k?`
        <ul uk-tab class="uk-margin-medium-bottom kp-tab-bar">
            <li><a href="#">Routes</a></li>
            <li><a href="#">Logs</a></li>
            <li><a href="#">Security</a></li>
            <li><a href="#">WAF</a></li>
        </ul>
        <ul class="uk-switcher">
            <li>${je()}</li>
            <li>${ee(t,a.SiteType)}</li>
            <li>${M(t)}</li>
            <li id="waf-tab-panel"></li>
        </ul>
        `:`
        <ul uk-tab class="uk-margin-medium-bottom kp-tab-bar">
            <li><a href="#">Overview</a></li>
            <li><a href="#">Nginx</a></li>
            ${c?'<li><a href="#">PHP</a></li>':""}
            <li><a href="#">MariaDB</a></li>
            <li><a href="#">Redis</a></li>
            <li><a href="#">Varnish</a></li>
            <li><a href="#">Logs</a></li>
            <li><a href="#">Security</a></li>
            <li><a href="#">WAF</a></li>
            ${a.SiteType===1?'<li><a href="#">WP-CLI</a></li>':""}
            <li><a href="#">Backups</a></li>
            ${p?'<li><a href="#">Crons</a></li>':""}
        </ul>

        <ul class="uk-switcher">
            <li>${we(a,s??[],n,a.ParentID??0,r.find(u=>u.ID===a.ParentID)?.Name??null)}</li>
            <li>${A(t,1,i[1])}</li>
            ${c?`<li>${A(t,2,i[2])}</li>`:""}
            <li>${A(t,3,i[3])}</li>
            <li>${A(t,4,i[4])}</li>
            <li>${pe(t,i[5])}</li>
            <li>${ee(t,a.SiteType)}</li>
            <li>${M(t)}</li>
            <li id="waf-tab-panel"></li>
            ${a.SiteType===1?`<li>${Ee(t)}</li>`:""}
            <li>${de(t)}</li>
            ${p?`<li>${be(t)}</li>`:""}
        </ul>`}`,document.getElementById("sd-back").addEventListener("click",()=>v.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>j(a)),document.getElementById("sd-site-nav")?.addEventListener("change",u=>{v.go("site-detail",{id:u.target.value})}),O(e),T(e),he(e,t),Ue(e,t),Te(t),k){Oe(e,t),We(t);return}document.getElementById("sd-recreate").addEventListener("click",async()=>{x("Recreating Pod","Recreating containers for this site...");try{await d.post(`/sites/${t}/recreate`),y(),l.success("Pod recreated"),v.go("site-detail",{id:t})}catch(u){y(),l.error(u.message)}}),document.getElementById("sd-clone")?.addEventListener("click",async()=>{let u=await U(a.Name);if(u){x("Cloning Site","Copying files and database \u2014 this may take a few minutes...");try{await d.post(`/sites/${t}/clone`,{name:u}),y(),l.success(`Site cloned as '${u}'`),v.go("sites")}catch(m){y(),l.error(m.message)}}}),e.querySelectorAll("[data-action]").forEach(u=>{u.addEventListener("click",async()=>{let m=u.dataset.action;if(m==="flush"){try{await d.post(`/sites/${t}/flush`),l.success("Caches flushed")}catch(g){l.error(g.message)}return}x(`${{start:"Starting",stop:"Stopping",restart:"Restarting",update:"Updating"}[m]??m} Pod`,"Please wait...");try{await d.post(`/sites/${t}/${m}`),y(),l.success(`Site ${m} successful`),v.go("site-detail",{id:t})}catch(g){y(),l.error(g.message)}})}),ke(e,t),Se(e,t),a.SiteType===1&&Le(e,t),$e(e,t,a),ue(e,t),R(e,t),p&&(ve(e,t),z(e,t)),Fe(e),ye(s??[])}async function J(e){let t=document.getElementById("totp-qr-img"),a=document.getElementById("totp-qr-wrap");if(!t||!a)return;if(a.querySelectorAll(".totp-uri-text").forEach(n=>n.remove()),typeof QRCode<"u")try{let n=await new Promise((o,i)=>{QRCode.toDataURL(e,{width:220,margin:2},(r,c)=>{r?i(r):o(c)})});t.src=n,t.style.display="";return}catch{}let s=document.createElement("p");s.className="totp-uri-text kp-muted uk-text-small",s.style.wordBreak="break-all",s.textContent=e,a.appendChild(s)}function K(e){document.getElementById("kp-backup-codes-modal")?.remove();let a=`
        <div id="kp-backup-codes-modal" uk-modal="bg-close:false;esc-close:false">
            <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:480px">
                <h3 class="uk-modal-title" style="color:var(--kp-yellow,#f0b429)">
                    <span uk-icon="warning"></span>&nbsp;Save Your Backup Codes
                </h3>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    These codes let you access your account if you lose your authenticator.
                    Each code works <strong>once only</strong>. Keep them somewhere safe.
                </p>
                <div class="kp-backup-codes-grid uk-margin-small">${e.map(n=>`<code class="kp-backup-code">${n}</code>`).join("")}</div>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    These codes will <strong>not</strong> be shown again.
                </p>
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button id="kp-backup-copy-btn" class="uk-button kp-btn-ghost">Copy All</button>
                    <button id="kp-backup-done-btn" class="uk-button kp-btn-primary">I've Saved These</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",a);let s=UIkit.modal("#kp-backup-codes-modal");s.show(),document.getElementById("kp-backup-copy-btn").addEventListener("click",()=>{let n=e.join(`
`),o=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(n).then(()=>{o.textContent="Copied!"});else{let i=document.createElement("textarea");i.value=n,i.style.cssText="position:fixed;opacity:0",document.body.appendChild(i),i.select();try{document.execCommand("copy"),o.textContent="Copied!"}catch{}i.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{s.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),v.go("users")})}function Ce(e){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let a=UIkit.modal("#kp-create-user-modal");a.show(),document.getElementById("create-user-form").addEventListener("submit",async s=>{s.preventDefault();let n=s.target.querySelector('[type="submit"]'),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let i=new FormData(s.target),r={fname:i.get("fname").trim(),lname:i.get("lname").trim(),uname:i.get("uname").trim(),email:i.get("email").trim(),phone:i.get("phone").trim(),password:i.get("password"),role:parseInt(i.get("role"))};try{let c=D(await d.post("/users",r));document.getElementById("users-table-body").insertAdjacentHTML("beforeend",ae(c)),l.success(`User '${c.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",Ve(c.id,a)}catch(c){l.error(c.message),n.disabled=!1,n.innerHTML=o}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function Ve(e,t){let a=()=>{t.hide(),document.getElementById("kp-create-user-modal")?.remove(),v.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",a),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let s=document.getElementById("cu-totp-setup-btn");s.disabled=!0,s.textContent="Setting up\u2026";try{let n=await d.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=n.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await J(n.uri)}catch(n){l.error(n.message),s.disabled=!1,s.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let s=document.getElementById("totp-confirm-code").value.trim();if(s.length!==6){l.error("Enter a 6-digit code");return}let n=document.getElementById("cu-totp-confirm-btn");n.disabled=!0;try{let o=await d.post(`/users/${e}/totp/confirm`,{code:s});t.hide(),document.getElementById("kp-create-user-modal")?.remove(),l.success("TOTP enabled"),o.backup_codes?.length?K(o.backup_codes):v.go("users")}catch(o){l.error(o.message),n.disabled=!1}})}async function Ie(e,t){document.getElementById("kp-edit-user-modal")?.remove();let a;try{a=D(await d.get(`/users/${t}`))}catch(k){l.error(k.message);return}let s=window.KP?.user?.role===99,n=`
        <div id="kp-edit-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit User \u2014 ${a.uname}</h3>
                <form id="edit-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        ${s?`
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" value="${a.uname}" autocomplete="off">
                        </div>`:""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" value="${a.fname}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" value="${a.lname}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" value="${a.email}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel" value="${a.phone||""}">
                        </div>
                        ${s?`
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Role</label>
                            <select class="uk-select kp-select" name="role">
                                <option value="50" ${a.role===50?"selected":""}>Manager</option>
                                <option value="99" ${a.role===99?"selected":""}>Admin</option>
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
                    ${a.totp_enabled?`<div class="uk-flex uk-flex-middle" style="gap:12px">
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
        </div>`;document.body.insertAdjacentHTML("beforeend",n);let o=UIkit.modal("#kp-edit-user-modal");o.show(),document.getElementById("edit-user-form").addEventListener("submit",async k=>{k.preventDefault();let p=k.target.querySelector('[type="submit"]'),u=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let m=new FormData(k.target),b={fname:m.get("fname").trim(),lname:m.get("lname").trim(),email:m.get("email").trim(),phone:m.get("phone").trim()};if(s){b.role=parseInt(m.get("role"));let h=m.get("uname");h&&(b.uname=h.trim())}let g=m.get("password");g&&(b.password=g);try{await d.put(`/users/${t}`,b),o.hide(),document.getElementById("kp-edit-user-modal")?.remove(),l.success("User updated"),v.go("users")}catch(h){l.error(h.message),p.disabled=!1,p.innerHTML=u}});let i=document.getElementById("totp-setup-btn");i&&i.addEventListener("click",async()=>{i.disabled=!0,i.textContent="Setting up\u2026";try{let k=await d.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=k.secret,document.getElementById("totp-setup-area").style.display="",await J(k.uri)}catch(k){l.error(k.message),i.disabled=!1,i.textContent="Enable TOTP"}});let r=document.getElementById("totp-confirm-btn");r&&r.addEventListener("click",async()=>{let k=document.getElementById("totp-confirm-code").value.trim();if(k.length!==6){l.error("Enter a 6-digit code");return}r.disabled=!0;try{let p=await d.post(`/users/${t}/totp/confirm`,{code:k});o.hide(),document.getElementById("kp-edit-user-modal")?.remove(),l.success("TOTP enabled"),p.backup_codes?.length?K(p.backup_codes):v.go("users")}catch(p){l.error(p.message),r.disabled=!1}});let c=document.getElementById("totp-disable-btn");c&&c.addEventListener("click",async()=>{c.disabled=!0;try{await d.delete(`/users/${t}/totp`),l.success("TOTP disabled"),o.hide(),document.getElementById("kp-edit-user-modal")?.remove(),v.go("users")}catch(k){l.error(k.message),c.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove())}async function Be(e){if(!B()){e.innerHTML=L("Access denied");return}let t=await d.get("/users");e.innerHTML=`
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
                    ${t.map(a=>ae(D(a))).join("")}
                </tbody>
            </table>
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>Ce(e)),ze(e)}function ae(e){let t=e.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>';return`<tr data-user-id="${e.id}">
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
    </tr>`}function ze(e){e.addEventListener("click",async t=>{let a=t.target.closest('[data-action="delete-user"]');if(!(!a||!await $("Delete User","Delete this user? This cannot be undone.")))try{await d.delete(`/users/${a.dataset.uid}`),a.closest("tr").remove(),l.success("User deleted")}catch(n){l.error(n.message)}}),e.addEventListener("click",async t=>{let a=t.target.closest('[data-action="edit-user"]');a&&Ie(e,a.dataset.uid)})}v.register("dashboard",e=>ie(e));v.register("sites",e=>ne(e));v.register("site-detail",(e,t)=>Pe(e,t));v.register("users",e=>Be(e));v.register("settings",e=>ce(e));v.register("security",e=>le(e));document.addEventListener("click",e=>{let t=e.target.closest("[data-view]");if(!t)return;e.preventDefault(),v.go(t.dataset.view);let a=document.getElementById("kp-offcanvas");a&&UIkit.offcanvas(a).hide()});document.addEventListener("click",async e=>{let t=e.target.closest("[data-action]");if(!t)return;e.stopPropagation();let{action:a,id:s}=t.dataset;switch(a){case"manage":v.go("site-detail",{id:s});break;case"start":await Q(s,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await Q(s,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await Q(s,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await Q(s,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"edit":{let n=await d.get(`/sites/${s}`);j(n.site);break}case"clone":{let n=await U(t.dataset.name??s);if(!n)break;x("Cloning Site","Copying files and database \u2014 this may take a few minutes...");try{let o=await d.post(`/sites/${s}/clone`,{name:n}),i=!1,r=0;for(;!i&&r<60;)await new Promise(k=>setTimeout(k,3e3)),i=(await d.get("/sites")).some(k=>k.ID===o.id&&k.SiteStatus===1),r++;y(),i?(l.success(`Site cloned as '${n}'`),v.go("sites")):l.error("Clone timed out \u2014 check container logs")}catch(o){y(),l.error(o.message)}break}case"delete":await Je(s);break;case"recreate":x("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await d.post(`/sites/${s}/recreate`),y(),l.success("Pod recreated")}catch(n){y(),l.error(n.message)}break}});document.addEventListener("kp:bulk-action",async e=>{let{action:t,ids:a}=e.detail;if(!a.length)return;x(`${{start:"Starting",stop:"Stopping",restart:"Restarting",flush:"Flushing Caches"}[t]} ${a.length} Site${a.length!==1?"s":""}`,"Please wait...");let n=await Promise.allSettled(a.map(i=>d.post(`/sites/${i}/${t}`)));y();let o=n.filter(i=>i.status==="rejected").length;o===0?l.success(`${t.charAt(0).toUpperCase()+t.slice(1)} complete for ${a.length} site${a.length!==1?"s":""}`):l.error(`${o} of ${a.length} sites failed \u2014 check logs`),["start","stop","restart"].includes(t)&&v.go("sites")});async function Q(e,t,a,s){x(a,s);try{await d.post(`/sites/${e}/${t}`),y(),l.success(a+" complete")}catch(n){y(),l.error(n.message)}}async function Je(e){if(!await $("Delete Site","This will stop and permanently remove the pod and all its data. Are you sure?"))return;x("Deleting Site","Stopping containers and removing the pod - please wait...");try{await d.delete(`/sites/${e}`)}catch{}let a=!1,s=0;for(;!a&&s<10;){try{await new Promise(o=>setTimeout(o,2e3)),a=!(await d.get("/sites")).find(o=>o.ID===parseInt(e))}catch{}s++}y(),a?(l.success("Site deleted"),v.go("sites")):l.error("Delete failed - site still exists after 20s")}window.addEventListener("hashchange",()=>{if(v._ownHashChange)return;let{view:e,params:t}=X();v.go(e,t)});var{view:Ke,params:Qe}=X();v.go(Ke,Qe);})();
