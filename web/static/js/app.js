/*! PodNest - Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com> | MIT License */

"use strict";(()=>{var Dn=Object.create;var ks=Object.defineProperty;var Hn=Object.getOwnPropertyDescriptor;var Nn=Object.getOwnPropertyNames;var Un=Object.getPrototypeOf,Fn=Object.prototype.hasOwnProperty;var B=(e,t)=>()=>{try{return t||e((t={exports:{}}).exports,t),t.exports}catch(s){throw t=0,s}};var Wn=(e,t,s,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of Nn(t))!Fn.call(e,n)&&n!==s&&ks(e,n,{get:()=>t[n],enumerable:!(a=Hn(t,n))||a.enumerable});return e};var jn=(e,t,s)=>(s=e!=null?Dn(Un(e)):{},Wn(t||!e||!e.__esModule?ks(s,"default",{value:e,enumerable:!0}):s,e));var Ba=B((Ec,Ia)=>{Ia.exports=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then}});var X=B(ie=>{var Ot,Wi=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];ie.getSymbolSize=function(t){if(!t)throw new Error('"version" cannot be null or undefined');if(t<1||t>40)throw new Error('"version" should be in range from 1 to 40');return t*4+17};ie.getSymbolTotalCodewords=function(t){return Wi[t]};ie.getBCHDigit=function(e){let t=0;for(;e!==0;)t++,e>>>=1;return t};ie.setToSJISFunction=function(t){if(typeof t!="function")throw new Error('"toSJISFunc" is not a valid function.');Ot=t};ie.isKanjiModeEnabled=function(){return typeof Ot<"u"};ie.toSJIS=function(t){return Ot(t)}});var tt=B(W=>{W.L={bit:1};W.M={bit:0};W.Q={bit:3};W.H={bit:2};function ji(e){if(typeof e!="string")throw new Error("Param is not a string");switch(e.toLowerCase()){case"l":case"low":return W.L;case"m":case"medium":return W.M;case"q":case"quartile":return W.Q;case"h":case"high":return W.H;default:throw new Error("Unknown EC Level: "+e)}}W.isValid=function(t){return t&&typeof t.bit<"u"&&t.bit>=0&&t.bit<4};W.from=function(t,s){if(W.isValid(t))return t;try{return ji(t)}catch{return s}}});var Aa=B((Cc,Ma)=>{function qa(){this.buffer=[],this.length=0}qa.prototype={get:function(e){let t=Math.floor(e/8);return(this.buffer[t]>>>7-e%8&1)===1},put:function(e,t){for(let s=0;s<t;s++)this.putBit((e>>>t-s-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(e){let t=Math.floor(this.length/8);this.buffer.length<=t&&this.buffer.push(0),e&&(this.buffer[t]|=128>>>this.length%8),this.length++}};Ma.exports=qa});var Da=B((Pc,Ra)=>{function Be(e){if(!e||e<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=e,this.data=new Uint8Array(e*e),this.reservedBit=new Uint8Array(e*e)}Be.prototype.set=function(e,t,s,a){let n=e*this.size+t;this.data[n]=s,a&&(this.reservedBit[n]=!0)};Be.prototype.get=function(e,t){return this.data[e*this.size+t]};Be.prototype.xor=function(e,t,s){this.data[e*this.size+t]^=s};Be.prototype.isReserved=function(e,t){return this.reservedBit[e*this.size+t]};Ra.exports=Be});var Ha=B(st=>{var Oi=X().getSymbolSize;st.getRowColCoords=function(t){if(t===1)return[];let s=Math.floor(t/7)+2,a=Oi(t),n=a===145?26:Math.ceil((a-13)/(2*s-2))*2,i=[a-7];for(let o=1;o<s-1;o++)i[o]=i[o-1]-n;return i.push(6),i.reverse()};st.getPositions=function(t){let s=[],a=st.getRowColCoords(t),n=a.length;for(let i=0;i<n;i++)for(let o=0;o<n;o++)i===0&&o===0||i===0&&o===n-1||i===n-1&&o===0||s.push([a[i],a[o]]);return s}});var Fa=B(Ua=>{var zi=X().getSymbolSize,Na=7;Ua.getPositions=function(t){let s=zi(t);return[[0,0],[s-Na,0],[0,s-Na]]}});var Wa=B(q=>{q.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};var oe={N1:3,N2:3,N3:40,N4:10};q.isValid=function(t){return t!=null&&t!==""&&!isNaN(t)&&t>=0&&t<=7};q.from=function(t){return q.isValid(t)?parseInt(t,10):void 0};q.getPenaltyN1=function(t){let s=t.size,a=0,n=0,i=0,o=null,r=null;for(let l=0;l<s;l++){n=i=0,o=r=null;for(let c=0;c<s;c++){let u=t.get(l,c);u===o?n++:(n>=5&&(a+=oe.N1+(n-5)),o=u,n=1),u=t.get(c,l),u===r?i++:(i>=5&&(a+=oe.N1+(i-5)),r=u,i=1)}n>=5&&(a+=oe.N1+(n-5)),i>=5&&(a+=oe.N1+(i-5))}return a};q.getPenaltyN2=function(t){let s=t.size,a=0;for(let n=0;n<s-1;n++)for(let i=0;i<s-1;i++){let o=t.get(n,i)+t.get(n,i+1)+t.get(n+1,i)+t.get(n+1,i+1);(o===4||o===0)&&a++}return a*oe.N2};q.getPenaltyN3=function(t){let s=t.size,a=0,n=0,i=0;for(let o=0;o<s;o++){n=i=0;for(let r=0;r<s;r++)n=n<<1&2047|t.get(o,r),r>=10&&(n===1488||n===93)&&a++,i=i<<1&2047|t.get(r,o),r>=10&&(i===1488||i===93)&&a++}return a*oe.N3};q.getPenaltyN4=function(t){let s=0,a=t.data.length;for(let i=0;i<a;i++)s+=t.data[i];return Math.abs(Math.ceil(s*100/a/5)-10)*oe.N4};function Vi(e,t,s){switch(e){case q.Patterns.PATTERN000:return(t+s)%2===0;case q.Patterns.PATTERN001:return t%2===0;case q.Patterns.PATTERN010:return s%3===0;case q.Patterns.PATTERN011:return(t+s)%3===0;case q.Patterns.PATTERN100:return(Math.floor(t/2)+Math.floor(s/3))%2===0;case q.Patterns.PATTERN101:return t*s%2+t*s%3===0;case q.Patterns.PATTERN110:return(t*s%2+t*s%3)%2===0;case q.Patterns.PATTERN111:return(t*s%3+(t+s)%2)%2===0;default:throw new Error("bad maskPattern:"+e)}}q.applyMask=function(t,s){let a=s.size;for(let n=0;n<a;n++)for(let i=0;i<a;i++)s.isReserved(i,n)||s.xor(i,n,Vi(t,i,n))};q.getBestMask=function(t,s){let a=Object.keys(q.Patterns).length,n=0,i=1/0;for(let o=0;o<a;o++){s(o),q.applyMask(o,t);let r=q.getPenaltyN1(t)+q.getPenaltyN2(t)+q.getPenaltyN3(t)+q.getPenaltyN4(t);q.applyMask(o,t),r<i&&(i=r,n=o)}return n}});var Vt=B(zt=>{var G=tt(),at=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],nt=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];zt.getBlocksCount=function(t,s){switch(s){case G.L:return at[(t-1)*4+0];case G.M:return at[(t-1)*4+1];case G.Q:return at[(t-1)*4+2];case G.H:return at[(t-1)*4+3];default:return}};zt.getTotalCodewordsCount=function(t,s){switch(s){case G.L:return nt[(t-1)*4+0];case G.M:return nt[(t-1)*4+1];case G.Q:return nt[(t-1)*4+2];case G.H:return nt[(t-1)*4+3];default:return}}});var ja=B(ot=>{var qe=new Uint8Array(512),it=new Uint8Array(256);(function(){let t=1;for(let s=0;s<255;s++)qe[s]=t,it[t]=s,t<<=1,t&256&&(t^=285);for(let s=255;s<512;s++)qe[s]=qe[s-255]})();ot.log=function(t){if(t<1)throw new Error("log("+t+")");return it[t]};ot.exp=function(t){return qe[t]};ot.mul=function(t,s){return t===0||s===0?0:qe[it[t]+it[s]]}});var Oa=B(Me=>{var Kt=ja();Me.mul=function(t,s){let a=new Uint8Array(t.length+s.length-1);for(let n=0;n<t.length;n++)for(let i=0;i<s.length;i++)a[n+i]^=Kt.mul(t[n],s[i]);return a};Me.mod=function(t,s){let a=new Uint8Array(t);for(;a.length-s.length>=0;){let n=a[0];for(let o=0;o<s.length;o++)a[o]^=Kt.mul(s[o],n);let i=0;for(;i<a.length&&a[i]===0;)i++;a=a.slice(i)}return a};Me.generateECPolynomial=function(t){let s=new Uint8Array([1]);for(let a=0;a<t;a++)s=Me.mul(s,new Uint8Array([1,Kt.exp(a)]));return s}});var Ka=B((Rc,Va)=>{var za=Oa();function Jt(e){this.genPoly=void 0,this.degree=e,this.degree&&this.initialize(this.degree)}Jt.prototype.initialize=function(t){this.degree=t,this.genPoly=za.generateECPolynomial(this.degree)};Jt.prototype.encode=function(t){if(!this.genPoly)throw new Error("Encoder not initialized");let s=new Uint8Array(t.length+this.degree);s.set(t);let a=za.mod(s,this.genPoly),n=this.degree-a.length;if(n>0){let i=new Uint8Array(this.degree);return i.set(a,n),i}return a};Va.exports=Jt});var Xt=B(Ja=>{Ja.isValid=function(t){return!isNaN(t)&&t>=1&&t<=40}});var Gt=B(z=>{var Xa="[0-9]+",Ki="[A-Z $%*+\\-./:]+",Ae="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";Ae=Ae.replace(/u/g,"\\u");var Ji="(?:(?![A-Z0-9 $%*+\\-./:]|"+Ae+`)(?:.|[\r
]))+`;z.KANJI=new RegExp(Ae,"g");z.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g");z.BYTE=new RegExp(Ji,"g");z.NUMERIC=new RegExp(Xa,"g");z.ALPHANUMERIC=new RegExp(Ki,"g");var Xi=new RegExp("^"+Ae+"$"),Gi=new RegExp("^"+Xa+"$"),Yi=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");z.testKanji=function(t){return Xi.test(t)};z.testNumeric=function(t){return Gi.test(t)};z.testAlphanumeric=function(t){return Yi.test(t)}});var Y=B(A=>{var Qi=Xt(),Yt=Gt();A.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]};A.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]};A.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]};A.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]};A.MIXED={bit:-1};A.getCharCountIndicator=function(t,s){if(!t.ccBits)throw new Error("Invalid mode: "+t);if(!Qi.isValid(s))throw new Error("Invalid version: "+s);return s>=1&&s<10?t.ccBits[0]:s<27?t.ccBits[1]:t.ccBits[2]};A.getBestModeForData=function(t){return Yt.testNumeric(t)?A.NUMERIC:Yt.testAlphanumeric(t)?A.ALPHANUMERIC:Yt.testKanji(t)?A.KANJI:A.BYTE};A.toString=function(t){if(t&&t.id)return t.id;throw new Error("Invalid mode")};A.isValid=function(t){return t&&t.bit&&t.ccBits};function Zi(e){if(typeof e!="string")throw new Error("Param is not a string");switch(e.toLowerCase()){case"numeric":return A.NUMERIC;case"alphanumeric":return A.ALPHANUMERIC;case"kanji":return A.KANJI;case"byte":return A.BYTE;default:throw new Error("Unknown mode: "+e)}}A.from=function(t,s){if(A.isValid(t))return t;try{return Zi(t)}catch{return s}}});var en=B(re=>{var rt=X(),eo=Vt(),Ga=tt(),Q=Y(),Qt=Xt(),Qa=7973,Ya=rt.getBCHDigit(Qa);function to(e,t,s){for(let a=1;a<=40;a++)if(t<=re.getCapacity(a,s,e))return a}function Za(e,t){return Q.getCharCountIndicator(e,t)+4}function so(e,t){let s=0;return e.forEach(function(a){let n=Za(a.mode,t);s+=n+a.getBitsLength()}),s}function ao(e,t){for(let s=1;s<=40;s++)if(so(e,s)<=re.getCapacity(s,t,Q.MIXED))return s}re.from=function(t,s){return Qt.isValid(t)?parseInt(t,10):s};re.getCapacity=function(t,s,a){if(!Qt.isValid(t))throw new Error("Invalid QR Code version");typeof a>"u"&&(a=Q.BYTE);let n=rt.getSymbolTotalCodewords(t),i=eo.getTotalCodewordsCount(t,s),o=(n-i)*8;if(a===Q.MIXED)return o;let r=o-Za(a,t);switch(a){case Q.NUMERIC:return Math.floor(r/10*3);case Q.ALPHANUMERIC:return Math.floor(r/11*2);case Q.KANJI:return Math.floor(r/13);case Q.BYTE:default:return Math.floor(r/8)}};re.getBestVersionForData=function(t,s){let a,n=Ga.from(s,Ga.M);if(Array.isArray(t)){if(t.length>1)return ao(t,n);if(t.length===0)return 1;a=t[0]}else a=t;return to(a.mode,a.getLength(),n)};re.getEncodedBits=function(t){if(!Qt.isValid(t)||t<7)throw new Error("Invalid QR Code version");let s=t<<12;for(;rt.getBCHDigit(s)-Ya>=0;)s^=Qa<<rt.getBCHDigit(s)-Ya;return t<<12|s}});var nn=B(an=>{var Zt=X(),sn=1335,no=21522,tn=Zt.getBCHDigit(sn);an.getEncodedBits=function(t,s){let a=t.bit<<3|s,n=a<<10;for(;Zt.getBCHDigit(n)-tn>=0;)n^=sn<<Zt.getBCHDigit(n)-tn;return(a<<10|n)^no}});var rn=B((Wc,on)=>{var io=Y();function we(e){this.mode=io.NUMERIC,this.data=e.toString()}we.getBitsLength=function(t){return 10*Math.floor(t/3)+(t%3?t%3*3+1:0)};we.prototype.getLength=function(){return this.data.length};we.prototype.getBitsLength=function(){return we.getBitsLength(this.data.length)};we.prototype.write=function(t){let s,a,n;for(s=0;s+3<=this.data.length;s+=3)a=this.data.substr(s,3),n=parseInt(a,10),t.put(n,10);let i=this.data.length-s;i>0&&(a=this.data.substr(s),n=parseInt(a,10),t.put(n,i*3+1))};on.exports=we});var cn=B((jc,ln)=>{var oo=Y(),es=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function xe(e){this.mode=oo.ALPHANUMERIC,this.data=e}xe.getBitsLength=function(t){return 11*Math.floor(t/2)+6*(t%2)};xe.prototype.getLength=function(){return this.data.length};xe.prototype.getBitsLength=function(){return xe.getBitsLength(this.data.length)};xe.prototype.write=function(t){let s;for(s=0;s+2<=this.data.length;s+=2){let a=es.indexOf(this.data[s])*45;a+=es.indexOf(this.data[s+1]),t.put(a,11)}this.data.length%2&&t.put(es.indexOf(this.data[s]),6)};ln.exports=xe});var un=B((Oc,dn)=>{var ro=Y();function Se(e){this.mode=ro.BYTE,typeof e=="string"?this.data=new TextEncoder().encode(e):this.data=new Uint8Array(e)}Se.getBitsLength=function(t){return t*8};Se.prototype.getLength=function(){return this.data.length};Se.prototype.getBitsLength=function(){return Se.getBitsLength(this.data.length)};Se.prototype.write=function(e){for(let t=0,s=this.data.length;t<s;t++)e.put(this.data[t],8)};dn.exports=Se});var mn=B((zc,pn)=>{var lo=Y(),co=X();function $e(e){this.mode=lo.KANJI,this.data=e}$e.getBitsLength=function(t){return t*13};$e.prototype.getLength=function(){return this.data.length};$e.prototype.getBitsLength=function(){return $e.getBitsLength(this.data.length)};$e.prototype.write=function(e){let t;for(t=0;t<this.data.length;t++){let s=co.toSJIS(this.data[t]);if(s>=33088&&s<=40956)s-=33088;else if(s>=57408&&s<=60351)s-=49472;else throw new Error("Invalid SJIS character: "+this.data[t]+`
Make sure your charset is UTF-8`);s=(s>>>8&255)*192+(s&255),e.put(s,13)}};pn.exports=$e});var kn=B((Vc,ts)=>{"use strict";var Re={single_source_shortest_paths:function(e,t,s){var a={},n={};n[t]=0;var i=Re.PriorityQueue.make();i.push(t,0);for(var o,r,l,c,u,p,m,b,h;!i.empty();){o=i.pop(),r=o.value,c=o.cost,u=e[r]||{};for(l in u)u.hasOwnProperty(l)&&(p=u[l],m=c+p,b=n[l],h=typeof n[l]>"u",(h||b>m)&&(n[l]=m,i.push(l,m),a[l]=r))}if(typeof s<"u"&&typeof n[s]>"u"){var g=["Could not find a path from ",t," to ",s,"."].join("");throw new Error(g)}return a},extract_shortest_path_from_predecessor_list:function(e,t){for(var s=[],a=t,n;a;)s.push(a),n=e[a],a=e[a];return s.reverse(),s},find_path:function(e,t,s){var a=Re.single_source_shortest_paths(e,t,s);return Re.extract_shortest_path_from_predecessor_list(a,s)},PriorityQueue:{make:function(e){var t=Re.PriorityQueue,s={},a;e=e||{};for(a in t)t.hasOwnProperty(a)&&(s[a]=t[a]);return s.queue=[],s.sorter=e.sorter||t.default_sorter,s},default_sorter:function(e,t){return e.cost-t.cost},push:function(e,t){var s={value:e,cost:t};this.queue.push(s),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};typeof ts<"u"&&(ts.exports=Re)});var xn=B(Ee=>{var I=Y(),fn=rn(),gn=cn(),vn=un(),yn=mn(),De=Gt(),lt=X(),uo=kn();function bn(e){return unescape(encodeURIComponent(e)).length}function He(e,t,s){let a=[],n;for(;(n=e.exec(s))!==null;)a.push({data:n[0],index:n.index,mode:t,length:n[0].length});return a}function wn(e){let t=He(De.NUMERIC,I.NUMERIC,e),s=He(De.ALPHANUMERIC,I.ALPHANUMERIC,e),a,n;return lt.isKanjiModeEnabled()?(a=He(De.BYTE,I.BYTE,e),n=He(De.KANJI,I.KANJI,e)):(a=He(De.BYTE_KANJI,I.BYTE,e),n=[]),t.concat(s,a,n).sort(function(o,r){return o.index-r.index}).map(function(o){return{data:o.data,mode:o.mode,length:o.length}})}function ss(e,t){switch(t){case I.NUMERIC:return fn.getBitsLength(e);case I.ALPHANUMERIC:return gn.getBitsLength(e);case I.KANJI:return yn.getBitsLength(e);case I.BYTE:return vn.getBitsLength(e)}}function po(e){return e.reduce(function(t,s){let a=t.length-1>=0?t[t.length-1]:null;return a&&a.mode===s.mode?(t[t.length-1].data+=s.data,t):(t.push(s),t)},[])}function mo(e){let t=[];for(let s=0;s<e.length;s++){let a=e[s];switch(a.mode){case I.NUMERIC:t.push([a,{data:a.data,mode:I.ALPHANUMERIC,length:a.length},{data:a.data,mode:I.BYTE,length:a.length}]);break;case I.ALPHANUMERIC:t.push([a,{data:a.data,mode:I.BYTE,length:a.length}]);break;case I.KANJI:t.push([a,{data:a.data,mode:I.BYTE,length:bn(a.data)}]);break;case I.BYTE:t.push([{data:a.data,mode:I.BYTE,length:bn(a.data)}])}}return t}function ko(e,t){let s={},a={start:{}},n=["start"];for(let i=0;i<e.length;i++){let o=e[i],r=[];for(let l=0;l<o.length;l++){let c=o[l],u=""+i+l;r.push(u),s[u]={node:c,lastCount:0},a[u]={};for(let p=0;p<n.length;p++){let m=n[p];s[m]&&s[m].node.mode===c.mode?(a[m][u]=ss(s[m].lastCount+c.length,c.mode)-ss(s[m].lastCount,c.mode),s[m].lastCount+=c.length):(s[m]&&(s[m].lastCount=c.length),a[m][u]=ss(c.length,c.mode)+4+I.getCharCountIndicator(c.mode,t))}}n=r}for(let i=0;i<n.length;i++)a[n[i]].end=0;return{map:a,table:s}}function hn(e,t){let s,a=I.getBestModeForData(e);if(s=I.from(t,a),s!==I.BYTE&&s.bit<a.bit)throw new Error('"'+e+'" cannot be encoded with mode '+I.toString(s)+`.
 Suggested mode is: `+I.toString(a));switch(s===I.KANJI&&!lt.isKanjiModeEnabled()&&(s=I.BYTE),s){case I.NUMERIC:return new fn(e);case I.ALPHANUMERIC:return new gn(e);case I.KANJI:return new yn(e);case I.BYTE:return new vn(e)}}Ee.fromArray=function(t){return t.reduce(function(s,a){return typeof a=="string"?s.push(hn(a,null)):a.data&&s.push(hn(a.data,a.mode)),s},[])};Ee.fromString=function(t,s){let a=wn(t,lt.isKanjiModeEnabled()),n=mo(a),i=ko(n,s),o=uo.find_path(i.map,"start","end"),r=[];for(let l=1;l<o.length-1;l++)r.push(i.table[o[l]].node);return Ee.fromArray(po(r))};Ee.rawSplit=function(t){return Ee.fromArray(wn(t,lt.isKanjiModeEnabled()))}});var $n=B(Sn=>{var dt=X(),as=tt(),bo=Aa(),ho=Da(),fo=Ha(),go=Fa(),os=Wa(),rs=Vt(),vo=Ka(),ct=en(),yo=nn(),wo=Y(),ns=xn();function xo(e,t){let s=e.size,a=go.getPositions(t);for(let n=0;n<a.length;n++){let i=a[n][0],o=a[n][1];for(let r=-1;r<=7;r++)if(!(i+r<=-1||s<=i+r))for(let l=-1;l<=7;l++)o+l<=-1||s<=o+l||(r>=0&&r<=6&&(l===0||l===6)||l>=0&&l<=6&&(r===0||r===6)||r>=2&&r<=4&&l>=2&&l<=4?e.set(i+r,o+l,!0,!0):e.set(i+r,o+l,!1,!0))}}function So(e){let t=e.size;for(let s=8;s<t-8;s++){let a=s%2===0;e.set(s,6,a,!0),e.set(6,s,a,!0)}}function $o(e,t){let s=fo.getPositions(t);for(let a=0;a<s.length;a++){let n=s[a][0],i=s[a][1];for(let o=-2;o<=2;o++)for(let r=-2;r<=2;r++)o===-2||o===2||r===-2||r===2||o===0&&r===0?e.set(n+o,i+r,!0,!0):e.set(n+o,i+r,!1,!0)}}function Eo(e,t){let s=e.size,a=ct.getEncodedBits(t),n,i,o;for(let r=0;r<18;r++)n=Math.floor(r/3),i=r%3+s-8-3,o=(a>>r&1)===1,e.set(n,i,o,!0),e.set(i,n,o,!0)}function is(e,t,s){let a=e.size,n=yo.getEncodedBits(t,s),i,o;for(i=0;i<15;i++)o=(n>>i&1)===1,i<6?e.set(i,8,o,!0):i<8?e.set(i+1,8,o,!0):e.set(a-15+i,8,o,!0),i<8?e.set(8,a-i-1,o,!0):i<9?e.set(8,15-i-1+1,o,!0):e.set(8,15-i-1,o,!0);e.set(a-8,8,1,!0)}function Lo(e,t){let s=e.size,a=-1,n=s-1,i=7,o=0;for(let r=s-1;r>0;r-=2)for(r===6&&r--;;){for(let l=0;l<2;l++)if(!e.isReserved(n,r-l)){let c=!1;o<t.length&&(c=(t[o]>>>i&1)===1),e.set(n,r-l,c),i--,i===-1&&(o++,i=7)}if(n+=a,n<0||s<=n){n-=a,a=-a;break}}}function To(e,t,s){let a=new bo;s.forEach(function(l){a.put(l.mode.bit,4),a.put(l.getLength(),wo.getCharCountIndicator(l.mode,e)),l.write(a)});let n=dt.getSymbolTotalCodewords(e),i=rs.getTotalCodewordsCount(e,t),o=(n-i)*8;for(a.getLengthInBits()+4<=o&&a.put(0,4);a.getLengthInBits()%8!==0;)a.putBit(0);let r=(o-a.getLengthInBits())/8;for(let l=0;l<r;l++)a.put(l%2?17:236,8);return Co(a,e,t)}function Co(e,t,s){let a=dt.getSymbolTotalCodewords(t),n=rs.getTotalCodewordsCount(t,s),i=a-n,o=rs.getBlocksCount(t,s),r=a%o,l=o-r,c=Math.floor(a/o),u=Math.floor(i/o),p=u+1,m=c-u,b=new vo(m),h=0,g=new Array(o),v=new Array(o),x=0,y=new Uint8Array(e.buffer);for(let $=0;$<o;$++){let M=$<l?u:p;g[$]=y.slice(h,h+M),v[$]=b.encode(g[$]),h+=M,x=Math.max(x,M)}let L=new Uint8Array(a),w=0,T,C;for(T=0;T<x;T++)for(C=0;C<o;C++)T<g[C].length&&(L[w++]=g[C][T]);for(T=0;T<m;T++)for(C=0;C<o;C++)L[w++]=v[C][T];return L}function Po(e,t,s,a){let n;if(Array.isArray(e))n=ns.fromArray(e);else if(typeof e=="string"){let c=t;if(!c){let u=ns.rawSplit(e);c=ct.getBestVersionForData(u,s)}n=ns.fromString(e,c||40)}else throw new Error("Invalid data");let i=ct.getBestVersionForData(n,s);if(!i)throw new Error("The amount of data is too big to be stored in a QR Code");if(!t)t=i;else if(t<i)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+i+`.
`);let o=To(t,s,n),r=dt.getSymbolSize(t),l=new ho(r);return xo(l,t),So(l),$o(l,t),is(l,s,0),t>=7&&Eo(l,t),Lo(l,o),isNaN(a)&&(a=os.getBestMask(l,is.bind(null,l,s))),os.applyMask(a,l),is(l,s,a),{modules:l,version:t,errorCorrectionLevel:s,maskPattern:a,segments:n}}Sn.create=function(t,s){if(typeof t>"u"||t==="")throw new Error("No input text");let a=as.M,n,i;return typeof s<"u"&&(a=as.from(s.errorCorrectionLevel,as.M),n=ct.from(s.version),i=os.from(s.maskPattern),s.toSJISFunc&&dt.setToSJISFunction(s.toSJISFunc)),Po(t,n,a,i)}});var ls=B(le=>{function En(e){if(typeof e=="number"&&(e=e.toString()),typeof e!="string")throw new Error("Color should be defined as hex string");let t=e.slice().replace("#","").split("");if(t.length<3||t.length===5||t.length>8)throw new Error("Invalid hex color: "+e);(t.length===3||t.length===4)&&(t=Array.prototype.concat.apply([],t.map(function(a){return[a,a]}))),t.length===6&&t.push("F","F");let s=parseInt(t.join(""),16);return{r:s>>24&255,g:s>>16&255,b:s>>8&255,a:s&255,hex:"#"+t.slice(0,6).join("")}}le.getOptions=function(t){t||(t={}),t.color||(t.color={});let s=typeof t.margin>"u"||t.margin===null||t.margin<0?4:t.margin,a=t.width&&t.width>=21?t.width:void 0,n=t.scale||4;return{width:a,scale:a?4:n,margin:s,color:{dark:En(t.color.dark||"#000000ff"),light:En(t.color.light||"#ffffffff")},type:t.type,rendererOpts:t.rendererOpts||{}}};le.getScale=function(t,s){return s.width&&s.width>=t+s.margin*2?s.width/(t+s.margin*2):s.scale};le.getImageWidth=function(t,s){let a=le.getScale(t,s);return Math.floor((t+s.margin*2)*a)};le.qrToImageData=function(t,s,a){let n=s.modules.size,i=s.modules.data,o=le.getScale(n,a),r=Math.floor((n+a.margin*2)*o),l=a.margin*o,c=[a.color.light,a.color.dark];for(let u=0;u<r;u++)for(let p=0;p<r;p++){let m=(u*r+p)*4,b=a.color.light;if(u>=l&&p>=l&&u<r-l&&p<r-l){let h=Math.floor((u-l)/o),g=Math.floor((p-l)/o);b=c[i[h*n+g]?1:0]}t[m++]=b.r,t[m++]=b.g,t[m++]=b.b,t[m]=b.a}}});var Ln=B(ut=>{var cs=ls();function _o(e,t,s){e.clearRect(0,0,t.width,t.height),t.style||(t.style={}),t.height=s,t.width=s,t.style.height=s+"px",t.style.width=s+"px"}function Io(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}ut.render=function(t,s,a){let n=a,i=s;typeof n>"u"&&(!s||!s.getContext)&&(n=s,s=void 0),s||(i=Io()),n=cs.getOptions(n);let o=cs.getImageWidth(t.modules.size,n),r=i.getContext("2d"),l=r.createImageData(o,o);return cs.qrToImageData(l.data,t,n),_o(r,i,o),r.putImageData(l,0,0),i};ut.renderToDataURL=function(t,s,a){let n=a;typeof n>"u"&&(!s||!s.getContext)&&(n=s,s=void 0),n||(n={});let i=ut.render(t,s,n),o=n.type||"image/png",r=n.rendererOpts||{};return i.toDataURL(o,r.quality)}});var Pn=B(Cn=>{var Bo=ls();function Tn(e,t){let s=e.a/255,a=t+'="'+e.hex+'"';return s<1?a+" "+t+'-opacity="'+s.toFixed(2).slice(1)+'"':a}function ds(e,t,s){let a=e+t;return typeof s<"u"&&(a+=" "+s),a}function qo(e,t,s){let a="",n=0,i=!1,o=0;for(let r=0;r<e.length;r++){let l=Math.floor(r%t),c=Math.floor(r/t);!l&&!i&&(i=!0),e[r]?(o++,r>0&&l>0&&e[r-1]||(a+=i?ds("M",l+s,.5+c+s):ds("m",n,0),n=0,i=!1),l+1<t&&e[r+1]||(a+=ds("h",o),o=0)):n++}return a}Cn.render=function(t,s,a){let n=Bo.getOptions(s),i=t.modules.size,o=t.modules.data,r=i+n.margin*2,l=n.color.light.a?"<path "+Tn(n.color.light,"fill")+' d="M0 0h'+r+"v"+r+'H0z"/>':"",c="<path "+Tn(n.color.dark,"stroke")+' d="'+qo(o,i,n.margin)+'"/>',u='viewBox="0 0 '+r+" "+r+'"',m='<svg xmlns="http://www.w3.org/2000/svg" '+(n.width?'width="'+n.width+'" height="'+n.width+'" ':"")+u+' shape-rendering="crispEdges">'+l+c+`</svg>
`;return typeof a=="function"&&a(null,m),m}});var In=B(Ne=>{var Mo=Ba(),us=$n(),_n=Ln(),Ao=Pn();function ps(e,t,s,a,n){let i=[].slice.call(arguments,1),o=i.length,r=typeof i[o-1]=="function";if(!r&&!Mo())throw new Error("Callback required as last argument");if(r){if(o<2)throw new Error("Too few arguments provided");o===2?(n=s,s=t,t=a=void 0):o===3&&(t.getContext&&typeof n>"u"?(n=a,a=void 0):(n=a,a=s,s=t,t=void 0))}else{if(o<1)throw new Error("Too few arguments provided");return o===1?(s=t,t=a=void 0):o===2&&!t.getContext&&(a=s,s=t,t=void 0),new Promise(function(l,c){try{let u=us.create(s,a);l(e(u,t,a))}catch(u){c(u)}})}try{let l=us.create(s,a);n(null,e(l,t,a))}catch(l){n(l)}}Ne.create=us.create;Ne.toCanvas=ps.bind(null,_n.render);Ne.toDataURL=ps.bind(null,_n.renderToDataURL);Ne.toString=ps.bind(null,function(e,t,s){return Ao.render(e,s)})});var k={async _req(e,t,s,a=6e4){let n=new AbortController,i=setTimeout(()=>n.abort(),a),o={method:e,headers:{"Content-Type":"application/json"},signal:n.signal};e!=="GET"&&e!=="HEAD"&&(o.headers["X-CSRF-Token"]=window.KP?.csrf??""),s!==void 0&&(o.body=JSON.stringify(s));try{let r=await fetch("/api"+t,o);clearTimeout(i);let l=r.status===204?null:await r.json().catch(()=>null);if(r.status===401)return window.location.href="/login?msg=expired",null;if(!r.ok)throw new Error(l?.error||`HTTP ${r.status}`);return l}catch(r){throw clearTimeout(i),r}},get:e=>k._req("GET",e),post:(e,t,s)=>k._req("POST",e,t,s),put:(e,t,s)=>k._req("PUT",e,t,s),delete:(e,t)=>k._req("DELETE",e,t),patch:(e,t)=>k._req("PATCH",e,t)};var f=e=>String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");function R(e){return e===0?"0 B":e<1024?`${e} B`:e<1048576?`${(e/1024).toFixed(1)} KB`:e<1073741824?`${(e/1048576).toFixed(1)} MB`:`${(e/1073741824).toFixed(2)} GB`}var Ue=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',D=e=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${f(e)}</div>
    </div>`,ce=(e,t)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${e}; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,Z=e=>{let t={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[s,a]=t[e]||["stopped","Unknown"];return`<span class="kp-status kp-status-${s}">${a}</span>`},On=e=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[e]||"?",V=e=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET",6:"Reverse Proxy",7:"Python"})[e]||"?",H=()=>window.KP.user.role===window.KP.roles.admin,ee=e=>{switch(e.SiteType){case 1:case 2:return`PHP ${On(e.PHPVersion)}`;case 4:return`Node ${{2:"22",4:"24",5:"25",6:"26"}[e.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[e.RuntimeVersion]||"?"}`;case 7:return`Python ${{1:"3.11",2:"3.12",3:"3.13",4:"3.14"}[e.RuntimeVersion]||"?"}`;case 6:return"Reverse Proxy";default:return""}},N=(e,t,s="")=>`<div class="kp-list-card-row">
        <span class="kp-list-card-label">${e}</span>
        <span class="kp-list-card-value ${s}">${t}</span>
    </div>`,te=e=>({id:e.id??e.ID,uname:e.uname??e.UName,uhash:e.uhash??e.UHash,fname:e.fname??e.FName,lname:e.lname??e.LName,email:e.email??e.Email,phone:e.phone??e.Phone,role:e.role??e.Role,totp_enabled:e.totp_enabled??!1,notify_email:e.notify_email??!1,notify_sms:e.notify_sms??!1,node_uid:e.node_uid??0,blocked:e.blocked??!1,created:e.created??e.Created});function P(e,t){return new Promise(s=>{document.getElementById("kp-confirm-title").textContent=e,document.getElementById("kp-confirm-message").textContent=t;let a=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{a.hide(),s(!0)},{once:!0}),a.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>s(!1),{once:!0})})}function _(e,t){let s=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${e}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${t}</p>
                <p class="kp-muted">
                    This may take several minutes while the task(s) complete, make sure to keep screen open until it has completed.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",s),UIkit.modal("#kp-progress-modal").show()}function E(){let e=document.getElementById("kp-progress-modal");e&&(UIkit.modal(e).hide(),setTimeout(()=>e.remove(),300))}function bs(e){return new Promise(t=>{let s="kp-clone-modal",a=`
            <div id="${s}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:420px">
                    <h3 class="uk-modal-title">Clone Site</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Enter a name and domain for the clone of <strong>${e}</strong>.
                        Files, database, and configuration will be copied \u2014 the clone is served on its own domain.
                    </p>
                    <input id="kp-clone-name" class="uk-input kp-input" type="text"
                        placeholder="clone-name" autocomplete="off">
                    <input id="kp-clone-domain" class="uk-input kp-input uk-margin-small-top" type="text"
                        placeholder="staging.example.com" autocomplete="off">
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-clone-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-clone-ok">
                            <span uk-icon="move"></span> Clone
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",a);let n=UIkit.modal(`#${s}`),i=document.getElementById("kp-clone-name"),o=document.getElementById("kp-clone-domain"),r=document.getElementById("kp-clone-ok"),l=document.getElementById("kp-clone-cancel"),c=u=>{n.hide(),setTimeout(()=>document.getElementById(s)?.remove(),300),t(u)};r.addEventListener("click",()=>{let u=i.value.trim(),p=o.value.trim();if(!u){i.focus();return}if(!p){o.focus();return}c({name:u,domain:p})}),l.addEventListener("click",()=>c(null),{once:!0}),document.getElementById(s).addEventListener("hidden",()=>c(null),{once:!0}),n.show(),setTimeout(()=>i.focus(),150),[i,o].forEach(u=>u.addEventListener("keydown",p=>{p.key==="Enter"&&r.click()}))})}function hs(e){return new Promise(t=>{let s="kp-rename-modal",a=`
            <div id="${s}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:420px">
                    <h3 class="uk-modal-title">Rename Site</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Enter a new name for <strong>${e}</strong>.  Please have patience, this takes a few minutes.
                    </p>
                    <input id="kp-rename-name" class="uk-input kp-input" type="text"
                        value="${e}" autocomplete="off">
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-rename-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-rename-ok">
                            <span uk-icon="pencil"></span> Rename
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",a);let n=UIkit.modal(`#${s}`),i=document.getElementById("kp-rename-name"),o=document.getElementById("kp-rename-ok"),r=document.getElementById("kp-rename-cancel"),l=c=>{n.hide(),setTimeout(()=>document.getElementById(s)?.remove(),300),t(c)};o.addEventListener("click",()=>l(i.value.trim()||null),{once:!0}),r.addEventListener("click",()=>l(null),{once:!0}),document.getElementById(s).addEventListener("hidden",()=>l(null),{once:!0}),n.show(),setTimeout(()=>i.focus(),150),i.addEventListener("keydown",c=>{c.key==="Enter"&&o.click()})})}function fs(e,t,s){return new Promise(a=>{let n="kp-sync-modal",i=t.map(p=>`<option value="${p.ID}">${p.Name} (${p.ParentID===e.ID?"clone":"parent"})</option>`).join(""),o=`
            <div id="${n}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                    <h3 class="uk-modal-title">Push Site</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        This will overwrite the selected content on the target with data from <strong>${e.Name}</strong>.
                        The target is backed up first, and the push is aborted if that backup fails.
                    </p>
                    <div class="uk-margin-small">
                        <label class="uk-form-label kp-text" for="kp-sync-target">Push To</label>
                        <select id="kp-sync-target" class="uk-select kp-select">${i}</select>
                    </div>
                    <div class="uk-flex uk-margin-small" style="gap:16px">
                        <label><input class="uk-checkbox" type="checkbox" id="kp-sync-files" checked> &nbsp;Files</label>
                        ${s?'<label><input class="uk-checkbox" type="checkbox" id="kp-sync-db" checked> &nbsp;Database</label>':""}
                    </div>
                    <div class="uk-margin-small">
                        <label class="uk-form-label kp-text" for="kp-sync-exclude">Exclude Paths (one per line, relative to the web root)</label>
                        <textarea class="uk-textarea kp-textarea" id="kp-sync-exclude" rows="3" placeholder="wp-content/uploads"></textarea>
                    </div>
                    <p class="kp-muted uk-text-small" style="color:var(--kp-red, #e05c5c)">
                        <span uk-icon="icon: warning; ratio: 0.85"></span>
                        The target will be temporarily unavailable during the push.
                    </p>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-sync-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-sync-ok">
                            <span uk-icon="cloud-upload"></span> Push Site
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",o);let r=UIkit.modal(`#${n}`),l=document.getElementById("kp-sync-ok"),c=document.getElementById("kp-sync-cancel"),u=p=>{r.hide(),setTimeout(()=>document.getElementById(n)?.remove(),300),a(p)};l.addEventListener("click",()=>{let p=parseInt(document.getElementById("kp-sync-target").value,10),m=document.getElementById("kp-sync-files").checked,b=document.getElementById("kp-sync-db")?.checked??!1,h=document.getElementById("kp-sync-exclude").value.split(`
`).map(g=>g.trim()).filter(Boolean);u({target_id:p,files:m,database:b,exclude:h})},{once:!0}),c.addEventListener("click",()=>u(null),{once:!0}),document.getElementById(n).addEventListener("hidden",()=>u(null),{once:!0}),r.show()})}var S={routes:{},_ownHashChange:!1,register(e,t){this.routes[e]=t},async go(e,t={}){let s=Object.keys(t).length?e+"/"+Object.values(t).join("/"):e;this._ownHashChange=!0,window.location.hash=s,setTimeout(()=>{this._ownHashChange=!1},0),document.querySelectorAll(".kp-nav-link").forEach(o=>{o.classList.toggle("kp-active",o.dataset.view===e)}),document.querySelectorAll(".kp-bn-item[data-view]").forEach(o=>{o.classList.toggle("kp-active",o.dataset.view===e)});let a=[...document.querySelectorAll(".kp-bn-more-menu a[data-view]")];a.forEach(o=>o.classList.toggle("kp-dd-active",o.dataset.view===e)),document.getElementById("kp-bn-more")?.classList.toggle("kp-active",a.some(o=>o.dataset.view===e));let n=this.routes[e];if(!n)return;let i=document.getElementById("kp-view");window.Chart&&i.querySelectorAll('canvas[id^="site-traffic-"]').forEach(o=>{window.Chart.getChart(o)?.destroy()}),i.innerHTML=Ue();try{await n(i,t)}catch(o){i.innerHTML=D(o.message)}}};function Fe(){let t=(window.location.hash.replace("#","")||"dashboard").split("/"),s=t[0],a={};return s==="site-detail"&&t[1]&&(a.id=t[1]),s==="settings"&&t[1]&&(a.tab=t[1]),s==="site-detail"&&t[2]&&(a.tab=t[2]),s==="security"&&t[1]&&(a.tab=t[1]),s==="waf"&&t[1]&&(a.tab=t[1]),{view:s,params:a}}var d={show(e,t="info",s=7e3){let a={success:"check",error:"warning",info:"info"},n=document.createElement("div");n.className=`kp-toast kp-toast-${t}`,n.innerHTML=`<span uk-icon="${a[t]||"info"}"></span><span>${f(e)}</span>`,document.getElementById("kp-toasts").appendChild(n),UIkit.icon(n.querySelector("[uk-icon]")),setTimeout(()=>n.remove(),s)},success:e=>d.show(e,"success"),error:e=>d.show(e,"error"),info:e=>d.show(e,"info")};var zn=2e3;function Vn(){return`
        <div id="admin-logs-panel">
            <div class="kp-card uk-padding-small">
                <h3 class="kp-view-title uk-margin-small-bottom">Admin Logs</h3>

                <div class="kp-log-controls">
                    <select class="uk-select kp-select" id="admin-log-source" style="width:160px;height:38px">
                        <option value="proxy">Proxy Access Log</option>
                        <option value="waf">WAF Log</option>
                    </select>
                    <select class="uk-select kp-select" id="admin-log-tail" style="width:120px;height:38px">
                        <option value="100">100 lines</option>
                        <option value="250">250 lines</option>
                        <option value="500">500 lines</option>
                        <option value="1000">1000 lines</option>
                    </select>
                    <button class="uk-button kp-btn-secondary kp-btn-sm" id="admin-log-connect"
                        uk-tooltip="Start Tailing the Logs">
                        <span uk-icon="play"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="admin-log-disconnect" disabled
                        uk-tooltip="Stop Tailing the Logs">
                        <span uk-icon="ban"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="admin-log-clear"
                        uk-tooltip="Clear the Logs">
                        <span uk-icon="trash"></span>
                    </button>
                    <label style="font-size:0.82rem;color:var(--kp-text-dim);display:flex;align-items:center;gap:6px">
                        <input type="checkbox" class="uk-checkbox" id="admin-log-autoscroll" checked>
                        Auto-scroll
                    </label>
                </div>

                <div class="kp-log-header">
                    <div class="kp-log-dot kp-log-dot-red"></div>
                    <div class="kp-log-dot kp-log-dot-yellow"></div>
                    <div class="kp-log-dot kp-log-dot-green"></div>
                    <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px"
                        id="admin-log-status">Disconnected</span>
                </div>
                <div class="kp-log-wrap" id="admin-log-output"></div>
            </div>
        </div>`}function Kn(e){let t=null,s=!1,a=e.querySelector("#admin-log-output"),n=e.querySelector("#admin-log-connect"),i=e.querySelector("#admin-log-disconnect"),o=e.querySelector("#admin-log-clear"),r=e.querySelector("#admin-log-autoscroll"),l=e.querySelector("#admin-log-status");function c(m){for(m.split(`
`).forEach(b=>{if(!b)return;let h=document.createElement("div");h.className=b.match(/WAF BLOCK/i)?"kp-log-line-err":b.match(/WAF DETECT/i)?"kp-log-line-warn":b.match(/error|crit|emerg/i)?"kp-log-line-err":b.match(/warn/i)?"kp-log-line-warn":b.match(/info|notice/i)?"kp-log-line-info":"",h.textContent=b,a.appendChild(h)});a.childElementCount>zn;)a.removeChild(a.firstChild);r.checked&&(a.scrollTop=a.scrollHeight)}function u(){t&&(t.close(),t=null),s=!1,n.disabled=!1,i.disabled=!0,l&&(l.textContent="Disconnected")}n.addEventListener("click",()=>{u();let m=e.querySelector("#admin-log-source").value,b=e.querySelector("#admin-log-tail").value,h=location.protocol==="https:"?"wss":"ws",g=m==="waf"?`${h}://${location.host}/api/logs/waf?tail=${b}`:`${h}://${location.host}/api/logs/proxy?tail=${b}`;t=new WebSocket(g),t.onopen=()=>{s=!0,n.disabled=!0,i.disabled=!1,l&&(l.textContent=`Connected \u2014 ${m==="waf"?"WAF Log":"Proxy Access Log"}`)},t.onmessage=v=>c(v.data),t.onerror=()=>{},t.onclose=()=>{s=!1,n.disabled=!1,i.disabled=!0,l&&(l.textContent="Disconnected")}}),i.addEventListener("click",u),o.addEventListener("click",()=>{a.innerHTML=""}),e.querySelector("#admin-log-source").addEventListener("change",()=>{t&&t.readyState===WebSocket.OPEN&&(u(),n.click())});let p=S.go.bind(S);S.go=function(m,b={}){return t&&u(),p(m,b)}}function gs(e){e.innerHTML=Vn(),Kn(e)}var je=50;function Jn(e,t,s){let a=Math.max(1,Math.ceil(e.total/je)),n=(e.entries??[]).map(vs).join("")||'<tr><td colspan="8" class="uk-text-center" style="color:var(--kp-text-dim)">No records found</td></tr>';return`
        <div id="audit-log-panel">
            <div class="kp-view-header">
                <h1 class="kp-view-title" style="font-size:2rem;">Audit Log</h1>
            </div>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-middle uk-flex-wrap kp-filter-bar">
                    <input class="uk-input kp-input" id="al-filter-user" type="text"
                        placeholder="Username" value="${U(t.username)}">
                    <input class="uk-input kp-input" id="al-filter-action" type="text"
                        placeholder="Action" value="${U(t.action)}">
                    <input class="uk-input kp-input" id="al-filter-target" type="text"
                        placeholder="Target type" value="${U(t.target_type)}">
                    <input class="uk-input kp-input" id="al-filter-date-from" type="date"
                        value="${U(t.date_from)}">
                    <input class="uk-input kp-input" id="al-filter-date-to" type="date"
                        value="${U(t.date_to)}">
                    <select class="uk-select kp-select" id="al-filter-auth">
                        <option value=""  ${t.auth===""?"selected":""}>All requests</option>
                        <option value="1" ${t.auth==="1"?"selected":""}>Authenticated</option>
                        <option value="0" ${t.auth==="0"?"selected":""}>Unauthenticated</option>
                    </select>
                    <div class="uk-flex uk-flex-middle" style="gap:4px">
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="al-filter-apply">
                            <span uk-icon="icon: search; ratio: 0.85"></span>
                        </button>
                        <button class="uk-button kp-btn-ghost kp-btn-sm" id="al-filter-clear">
                            <span uk-icon="icon: close; ratio: 0.85"></span>
                        </button>
                    </div>
                    <span id="al-record-count" class="uk-margin-auto-left kp-text-dim kp-text-sm">
                        ${e.total} record${e.total!==1?"s":""}
                    </span>
                </div>
            </div>

            <div class="kp-table-wrap">
                <div class="uk-overflow-auto">
                <table class="uk-table uk-table-divider uk-table-small uk-table-middle uk-margin-remove">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>User</th>
                            <th>IP</th>
                            <th>Method</th>
                            <th>Action</th>
                            <th>Status</th>
                            <th>Details</th>
                            <th>State diff</th>
                        </tr>
                    </thead>
                    <tbody id="al-table-body">${n}</tbody>
                </table>
                </div>
            </div>

            ${a>1?`<div id="al-pager">${ys(s,a)}</div>`:'<div id="al-pager"></div>'}
        </div>`}function vs(e){let t=new Date(e.ts).toLocaleString(),s=e.username?`<span style="font-family:monospace">${U(e.username)}</span>`:'<span style="color:var(--kp-text-dim)">\u2014</span>',a=Xn(e.status),i=e.prior_state||e.new_state?`<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="${U(e.prior_state)}" data-new="${U(e.new_state)}">
               <span uk-icon="icon: git-fork; ratio: 0.85"></span>
           </button>`:"<span>\u2014</span>",o=e.details?`<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="" data-new="${U(e.details)}">
               <span uk-icon="icon: info; ratio: 0.85"></span>
           </button>`:"<span>\u2014</span>";return`<tr>
        <td style="white-space:nowrap;font-size:0.82rem">${t}</td>
        <td>${s}</td>
        <td style="font-family:monospace;font-size:0.82rem">${U(e.ip)}</td>
        <td><span class="kp-badge">${U(e.method)}</span></td>
        <td style="font-family:monospace;font-size:0.82rem">${U(e.action)}</td>
        <td>${a}</td>
        <td>${o}</td>
        <td>${i}</td>
    </tr>`}function ys(e,t){let s=e>1?'<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-prev">\u2039 Prev</button>':"",a=e<t?'<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-next">Next \u203A</button>':"";return`<div class="uk-flex uk-flex-middle uk-flex-center uk-margin-small-top" style="gap:12px">
        ${s}
        <span style="font-size:0.85rem;color:var(--kp-text-dim)">Page ${e} of ${t}</span>
        ${a}
    </div>`}function Xn(e){return`<span class="kp-badge ${e>=500?"kp-badge-error":e>=400?"kp-badge-warn":e>=300?"kp-badge-info":"kp-badge-ok"}">${e}</span>`}var U=e=>f(e??"");async function ws(e,t){let s=new URLSearchParams({page:t,page_size:je});return e.username&&s.set("username",e.username),e.action&&s.set("action",e.action),e.target_type&&s.set("target_type",e.target_type),e.date_from&&s.set("date_from",e.date_from),e.date_to&&s.set("date_to",e.date_to),e.auth!==""&&s.set("auth",e.auth),k.get(`/audit?${s}`)}function Gn(e){return{username:e.querySelector("#al-filter-user").value.trim(),action:e.querySelector("#al-filter-action").value.trim(),target_type:e.querySelector("#al-filter-target").value.trim(),date_from:e.querySelector("#al-filter-date-from").value,date_to:e.querySelector("#al-filter-date-to").value,auth:e.querySelector("#al-filter-auth").value}}async function Yn(e,t,s){async function a(o,r){let l=await ws(o,r);e.querySelector("#al-table-body").innerHTML=(l.entries??[]).map(vs).join("")||'<tr><td colspan="8" class="uk-text-center kp-text-dim">No records found</td></tr>';let c=Math.max(1,Math.ceil(l.total/je)),u=e.querySelector("#al-pager");u&&(u.innerHTML=c>1?ys(r,c):""),e.querySelector("#al-record-count").textContent=`${l.total} record${l.total!==1?"s":""}`,n(e,o,r,c),t=o,s=r}function n(o,r,l,c){o.querySelector("#al-prev")?.addEventListener("click",()=>a(r,l-1)),o.querySelector("#al-next")?.addEventListener("click",()=>a(r,l+1))}e.querySelector("#al-filter-apply")?.addEventListener("click",()=>{a(Gn(e),1)}),e.querySelector("#al-filter-clear")?.addEventListener("click",()=>{["al-filter-user","al-filter-action","al-filter-target","al-filter-date-from","al-filter-date-to"].forEach(o=>{let r=e.querySelector(`#${o}`);r&&(r.value="")}),e.querySelector("#al-filter-auth").value="",a({username:"",action:"",target_type:"",date_from:"",date_to:"",auth:""},1)});let i=Math.max(1,Math.ceil(parseInt(e.querySelector("#al-record-count")?.textContent??"0")/je));n(e,t,s,i),e.querySelector("#audit-log-panel")?.addEventListener("click",o=>{let r=o.target.closest(".al-diff-btn");if(!r)return;o.preventDefault(),o.stopPropagation();let l=r.dataset.prior??"",c=r.dataset.new??"",u="";l&&c?u=`=== BEFORE ===
`+We(l)+`

=== AFTER ===
`+We(c):c?u=We(c):u=We(l),document.body.insertAdjacentHTML("beforeend",`
            <div id="al-diff-modal-inst" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-bottom">Request Detail</h3>
                    <pre class="kp-cron-output">${U(u)}</pre>
                </div>
            </div>`);let p=document.getElementById("al-diff-modal-inst");UIkit.modal(p).show(),p.addEventListener("hidden",()=>p.remove(),{once:!0})})}function We(e){try{return JSON.stringify(JSON.parse(e),null,2)}catch{return e}}async function xs(e){if(!H()){e.innerHTML=D("Access denied");return}let t={username:"",action:"",target_type:"",date_from:"",date_to:"",auth:""},s=await ws(t,1);e.innerHTML=Jn(s,t,1),Yn(e,t,1)}var K="/disaster-recovery";function Qn(e){return e.s3_configured?e.disabled?["Automatic disaster recovery is disabled.","#disaster-recovery","Disaster Recovery"]:e.key_enrolled?e.result==="failed"?["The latest disaster recovery run failed.","#disaster-recovery","View details"]:!e.last_verified||e.last_verified.startsWith("0001")?["A verified recovery point is missing.","#disaster-recovery","Disaster Recovery"]:null:["Recovery key enrollment required","#disaster-recovery","Enroll recovery key"]:["Configure S3 to enable disaster recovery.","#settings/backups","Backup settings"]}function Ss(e){let t=document.getElementById("kp-dr-warning");if(!t)return;let s=Qn(e);if(t.hidden=!s,s){let[a,n,i]=s;t.querySelector("strong").textContent=a;let o=t.querySelector(".kp-update-banner-row a");o.href=n,o.textContent=i}}async function ft(){try{let e=await k.get(K);e&&Ss(e)}catch{}}async function gt(e){if(window.KP?.user?.role!==99)return;let t=await k.get(K);if(!t||window.location.hash!=="#disaster-recovery")return;Ss(t);let s=t.last_verified&&!t.last_verified.startsWith("0001")?new Date(t.last_verified).toLocaleString():"None",a={running:"Running",failed:"Failed",succeeded:"Succeeded"};e.innerHTML=`
        <section class="kp-card uk-padding-small" data-dr-panel>
            <h3 class="kp-view-title">Disaster Recovery</h3>
            <dl class="uk-description-list kp-dr-status">
                <div><dt>S3 configuration</dt><dd>${t.s3_configured?"Configured":"Required"}</dd></div>
                <div><dt>Recovery key enrollment</dt><dd>${t.key_enrolled?"Enrolled":"Required"}</dd></div>
                <div><dt>Latest run</dt><dd data-dr-result>${a[t.result]??"Pending"}</dd></div>
                <div><dt>Last verified recovery point</dt><dd>${f(s)}</dd></div>
            </dl>
            ${t.error?`<div class="uk-alert-danger uk-padding-small" role="alert"><div class="uk-text-break">${f(t.error)}</div></div>`:""}
            ${t.s3_configured&&!t.key_enrolled?`
                    <form class="uk-form-stacked uk-margin-small-bottom" id="kp-dr-enroll">
                        <label class="kp-label" for="kp-dr-passphrase">Recovery passphrase</label>
                        <input class="uk-input kp-input" type="password" id="kp-dr-passphrase"
                            name="passphrase" autocomplete="new-password" required>
                        <label class="kp-label uk-margin-small-top" for="kp-dr-confirmation">Confirm recovery passphrase</label>
                        <input class="uk-input kp-input" type="password" id="kp-dr-confirmation"
                            name="confirmation" autocomplete="new-password" required>
                        <p>Use at least 8 characters and save the passphrase outside PodNest and S3. You\u2019ll need it to recover this server.</p>
                        <button type="submit" class="kp-btn-primary">Enroll recovery key</button>
                    </form>`:""}
            <form class="uk-form-stacked uk-margin-small-top" id="kp-dr-form">
                <label class="uk-display-block uk-margin-small-bottom">
                    <input type="checkbox" class="uk-checkbox" name="automatic" ${t.disabled?"":"checked"}>
                    Enable automatic disaster recovery
                </label>
                <label class="kp-label" for="kp-dr-schedule">Five-field cron schedule</label>
                <input id="kp-dr-schedule" class="uk-input kp-input" name="schedule" maxlength="128" required
                    value="${f(t.schedule)}">
                <div class="uk-margin-small-top">
                    <button type="submit" class="kp-btn-primary">Save schedule</button>
                    <button type="button" class="kp-btn-secondary" id="kp-dr-run"
                        ${t.result==="running"||!t.s3_configured||!t.key_enrolled?"disabled":""}>
                        Run Disaster Recovery
                    </button>
                    <button type="button" class="kp-btn-secondary" id="kp-dr-refresh">Refresh</button>
                </div>
            </form>
            <div class="uk-margin-top" data-dr-progress hidden>
                <p id="kp-dr-progress-label" role="status"></p>
                <progress class="uk-progress" aria-labelledby="kp-dr-progress-label"></progress>
            </div>
            <div class="uk-margin-top" data-dr-site-results hidden>
                <h4 class="kp-view-title">Site backup results</h4>
                <ul class="uk-list uk-list-divider"></ul>
                <p class="kp-muted" data-dr-archive-error hidden>Site downloads are temporarily unavailable.</p>
            </div>
            <div class="uk-margin-top" id="kp-dr-restore" hidden>
                <h4 class="kp-view-title">Site restoration</h4>
                <button type="button" class="kp-btn-secondary" id="kp-dr-retry-all">Retry Failed Sites</button>
                <ul class="uk-list uk-list-divider" id="kp-dr-restore-sites"></ul>
            </div>
            ${s!=="None"?`
                <div class="uk-margin-top" id="kp-dr-archives">
                    <h4 class="kp-view-title">Recovery archives</h4>
                    <a class="kp-btn-secondary kp-btn-sm" href="/api/disaster-recovery/download">Download application archive</a>
                </div>`:""}
        </section>`;let n=e.querySelector("[data-dr-panel]");t.result!=="running"&&Zn(n,t,s!=="None");let i=()=>{n.isConnected&&gt(e).catch(r=>d.error(r.message))};n.querySelector("#kp-dr-refresh").addEventListener("click",i),n.querySelector("#kp-dr-enroll")?.addEventListener("submit",async r=>{r.preventDefault();let l=r.currentTarget,c=l.elements.passphrase.value;if(c!==l.elements.confirmation.value){d.error("Recovery passphrases do not match");return}let u=l.querySelector("button");u.disabled=!0,l.reset();try{await k.post(K+"/enroll",{passphrase:c}),d.success("Recovery key enrolled"),i()}catch(p){d.error(p.message)}finally{u.disabled=!1}}),n.querySelector("#kp-dr-form").addEventListener("submit",async r=>{r.preventDefault();let l=new FormData(r.currentTarget);try{await k.put(K,{disabled:!l.has("automatic"),schedule:l.get("schedule")}),d.success("Disaster recovery schedule saved"),i()}catch(c){d.error(c.message)}}),ht(n);let o=n.querySelector("#kp-dr-run");o.addEventListener("click",async()=>{o.disabled=!0;try{await k.post(K+"/run"),d.success("Disaster recovery queued")}catch(r){d.error(r.message),o.disabled=!1}}),ei(n,t,i)}async function Zn(e,t,s){let a=e.querySelector("[data-dr-site-results]"),n=a.querySelector("ul"),i=new Map;function o(l,c){let u=document.createElement("li");u.className="kp-dr-site-result";let p=document.createElement("div"),m=document.createElement("strong");m.textContent=l.name;let b=document.createElement("div");return b.textContent=c,p.append(m,b),u.append(p),n.append(u),i.set(String(l.id),u),a.hidden=!1,u}for(let l of t.site_backups??[])o(l,l.error?`${l.state} \u2014 ${l.error}`:l.state);if(!s)return;let r=()=>e.isConnected&&e.querySelector("[data-dr-progress]").hidden;try{let l=await k.get(K+"/archives");if(!r())return;for(let c of l??[]){let u=i.get(String(c.id))??o(c,"Last verified recovery point"),p=document.createElement("a");p.className="kp-btn-secondary kp-btn-sm",p.href="/api/disaster-recovery/download/"+encodeURIComponent(c.id),p.textContent="Download",p.setAttribute("aria-label",`Download the last verified archive for ${c.name}`),u.append(p)}}catch{if(!r())return;a.hidden=!1,a.querySelector("[data-dr-archive-error]").hidden=!1}}async function ht(e){if(!e.isConnected)return;let t=K+"/restore",s=e.querySelector("#kp-dr-restore"),a=e.querySelector("#kp-dr-restore-sites"),n=e.querySelector("#kp-dr-retry-all"),i=async o=>{try{await k.post(t,{retry:!0,site:o}),d.success("Site recovery queued"),await ht(e)}catch(r){d.error(r.message)}};try{let o=await k.get(t);if(!e.isConnected||!o||!o.sites.length)return;s.hidden=!1,n.disabled=o.busy||!o.sites.some(r=>["failed","running"].includes(r.state)),n.onclick=()=>i(""),a.replaceChildren(...o.sites.map(r=>{let l=document.createElement("li"),c=document.createElement("span");if(c.textContent=r.name+" \u2014 "+r.state+(r.error?": "+r.error:""),l.append(c),["failed","running"].includes(r.state)){let u=document.createElement("button");u.type="button",u.className="kp-btn-secondary kp-btn-sm uk-margin-small-left",u.textContent="Retry",u.disabled=o.busy,u.onclick=()=>i(r.name),l.append(u)}return l})),o.busy&&setTimeout(()=>ht(e),3e3)}catch(o){e.isConnected&&d.error(o.message)}}function ei(e,t,s){let a=e.querySelector("[data-dr-progress]"),n=a.querySelector("progress"),i=a.querySelector("p"),o=e.querySelector("#kp-dr-run"),r=e.querySelector("[data-dr-result]"),l=t,c;function u(b){if(a.hidden=b.result!=="running",a.hidden)return;o.disabled=!0,e.querySelector("[data-dr-site-results]").hidden=!0,r.textContent="In progress";let h=b.site_backups??[],g=h.find(x=>x.state==="running"),v=h.filter(x=>x.state!=="running").length;v>0&&v<b.site_total?(n.max=b.site_total,n.value=v):n.removeAttribute("value"),i.textContent=g?`Backing up ${g.name} \xB7 ${b.site_total?`${v} of ${b.site_total} sites processed`:"In progress"}`:b.site_total&&v===b.site_total?"Verifying the recovery point":"Preparing disaster recovery"}let p=new MutationObserver(()=>{e.isConnected||(p.disconnect(),c?.close())});p.observe(e.parentNode,{childList:!0});function m(){if(!e.isConnected)return;let b=location.protocol==="https:"?"wss:":"ws:";c=new WebSocket(`${b}//${location.host}/api${K}/progress`),c.addEventListener("message",h=>{if(!e.isConnected)return;let g=JSON.parse(h.data);if(g.result!=="running"&&(g.result!==l.result||g.started!==l.started)){l=g,s();return}u(g),l=g}),c.addEventListener("close",()=>{e.isConnected&&(l.result==="running"&&(i.textContent="Reconnecting to backup progress\u2026"),setTimeout(m,2e3))})}u(t),m()}function Oe(){document.body.insertAdjacentHTML("beforeend",`
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
                                <option value="7">Python</option>                                
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
                        <div class="uk-width-1-2@s uk-hidden" id="cs-python-version-wrap">
                            <label class="kp-label">Python Version</label>
                            <select class="uk-select kp-select" name="python_version">
                                <option value="1">Python 3.11</option>
                                <option value="2">Python 3.12</option>
                                <option value="3">Python 3.13</option>
                                <option value="4" selected>Python 3.14</option>
                            </select>
                        </div>
                        <div class="uk-width-1-1 uk-hidden" id="cs-start-command-wrap">
                            <label class="kp-label">Start Command</label>
                            <input class="uk-input kp-input" name="start_command" type="text" placeholder="node server.js, dotnet MyApp.dll, or gunicorn -b 0.0.0.0:8000 app:app">
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
        </div>`);let t=UIkit.modal("#kp-create-site-modal"),s=document.getElementById("cs-site-type"),a=document.getElementById("cs-php-version-wrap"),n=document.getElementById("cs-node-version-wrap"),i=document.getElementById("cs-dotnet-version-wrap"),o=document.getElementById("cs-python-version-wrap"),r=document.getElementById("cs-start-command-wrap"),l=document.getElementById("cs-wordpress-wrap");t.show();let c=document.getElementById("cs-domains-wrap"),u=document.getElementById("cs-rp-note");s.addEventListener("change",()=>{let p=parseInt(s.value);a.classList.toggle("uk-hidden",p!==1&&p!==2||p===6),n.classList.toggle("uk-hidden",p!==4),i.classList.toggle("uk-hidden",p!==5),o.classList.toggle("uk-hidden",p!==7),r.classList.toggle("uk-hidden",p!==4&&p!==5&&p!==7),r.querySelector("input").required=p===7,l.classList.toggle("uk-hidden",p!==1||p===6),c.classList.toggle("uk-hidden",p===6),u.classList.toggle("uk-hidden",p!==6)}),document.getElementById("create-site-form").addEventListener("submit",async p=>{p.preventDefault();let m=p.target.querySelector('[type="submit"]'),b=m.innerHTML;m.disabled=!0,m.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let h=new FormData(p.target),g=parseInt(h.get("site_type")),v=null;g===4&&(v=parseInt(h.get("node_version"))),g===5&&(v=parseInt(h.get("dotnet_version"))),g===7&&(v=parseInt(h.get("python_version")));let x={name:h.get("name").trim(),php_version:parseInt(h.get("php_version"))||3,site_type:g,runtime_version:v,start_command:h.get("start_command")?.trim()||"",domains:h.get("domains").split(`
`).map(L=>L.trim()).filter(Boolean),install_wordpress:g===1?h.get("install_wordpress")==="on":!1};t.hide(),document.getElementById("kp-create-site-modal")?.remove();let y=g===6?`Setting up '${x.name}' as a reverse proxy...`:`Setting up '${x.name}' \u2014 pulling images and provisioning containers...`;_("Creating Site",y);try{await k.post("/sites",x,6e5),E(),d.success(`Site '${x.name}' created`),S.go("sites")}catch(L){E(),d.error(L.message),m.disabled=!1,m.innerHTML=b}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}function $s(){return Ls({title:"Add Node",intro:"On the child node, use Generate Pairing Code, then enter its URL and code here.",okLabel:"Pair",okIcon:"link",fields:`
            <label class="kp-label">Name</label>
            <input id="kp-node-name" class="uk-input kp-input" type="text" maxlength="100" autocomplete="off">
            <label class="kp-label uk-margin-small-top">URL</label>
            <input id="kp-node-url" class="uk-input kp-input" type="text" placeholder="https://node.example.com" autocomplete="off">
            <label class="kp-label uk-margin-small-top">Pairing Code</label>
            <input id="kp-node-code" class="uk-input kp-input" type="text" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off"
                style="letter-spacing:0.2em;text-align:center">`,read:()=>{let e=document.getElementById("kp-node-name"),t=document.getElementById("kp-node-url"),s=document.getElementById("kp-node-code");for(let a of[e,t,s])if(!a.value.trim())return a.focus(),null;return{name:e.value.trim(),url:t.value.trim(),code:s.value.trim()}}})}function Es(e){return Ls({title:`Edit Node \u2014 ${f(e.name)}`,intro:"A URL change or re-key opens the child in a new tab to apply it; it takes effect once the child confirms.",okLabel:"Save",okIcon:"pencil",fields:`
            <label class="kp-label">Name</label>
            <input id="kp-node-name" class="uk-input kp-input" type="text" maxlength="100" value="${f(e.name)}" autocomplete="off">
            <label class="kp-label uk-margin-small-top">URL</label>
            <input id="kp-node-url" class="uk-input kp-input" type="text" value="${f(e.url)}" autocomplete="off"
                ${e.status!==2?"disabled":""}>
            <label class="uk-margin-small-top uk-display-block">
                <input id="kp-node-rekey" class="uk-checkbox" type="checkbox" ${e.status!==2?"disabled":""}> &nbsp;Re-key this link
            </label>`,read:()=>{let t=document.getElementById("kp-node-name");return t.value.trim()?{name:t.value.trim(),url:document.getElementById("kp-node-url").value.trim(),rekey:document.getElementById("kp-node-rekey").checked}:(t.focus(),null)}})}function Ls({title:e,intro:t,okLabel:s,okIcon:a,fields:n,read:i}){return new Promise(o=>{let r="kp-node-modal";document.getElementById(r)?.remove();let l=`
            <div id="${r}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                    <h3 class="uk-modal-title">${e}</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">${t}</p>
                    ${n}
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-node-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-node-ok">
                            <span uk-icon="${a}"></span> ${s}
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",l);let c=document.getElementById(r),u=UIkit.modal(c),p=!1,m=b=>{p||(p=!0,u.hide(),setTimeout(()=>c.remove(),300),o(b))};document.getElementById("kp-node-ok").addEventListener("click",()=>{let b=i();b&&m(b)}),document.getElementById("kp-node-cancel").addEventListener("click",()=>m(null),{once:!0}),c.addEventListener("hidden",()=>m(null),{once:!0}),c.querySelectorAll("input[type=text]").forEach(b=>b.addEventListener("keydown",h=>{h.key==="Enter"&&document.getElementById("kp-node-ok").click()})),u.show(),setTimeout(()=>document.getElementById("kp-node-name")?.focus(),150)})}var ze=2;async function se(e){if(!H()){e.innerHTML=D("Access denied");return}let t=await k.get("/nodes");e.innerHTML=`
        <div id="kp-nodes">
            <div class="kp-view-header">
                <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Nodes</h1>
                <button class="uk-button kp-btn-primary" data-action="node-add">
                    <span uk-icon="plus"></span> Add Node
                </button>
            </div>
            ${t.length?`
            <div class="kp-table-wrap">
                <div class="uk-overflow-auto">
                <table class="uk-table uk-table-divider uk-table-middle uk-margin-remove">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>URL</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${t.map(ti).join("")}
                    </tbody>
                </table>
                </div>
            </div>`:ce("server","No child nodes yet")}
        </div>`;let s=document.getElementById("kp-nodes");s.addEventListener("click",a=>si(a,e,t)),window.addEventListener("focus",()=>{document.getElementById("kp-nodes")===s&&se(e)},{once:!0})}function ti(e){let t=e.status===ze?'<span class="kp-status kp-status-running">Paired</span>':'<span class="kp-status kp-status-restarting">Pending</span>';return`<tr>
        <td><strong>${f(e.name)}</strong></td>
        <td><span style="font-family:monospace">${f(e.url)}</span></td>
        <td>${t}</td>
        <td><span class="kp-muted">${f(e.created)}</span></td>
        <td>
            <div class="uk-flex" style="gap:6px;justify-content:flex-end">
                ${e.status===ze?`
                <button class="uk-button kp-btn-primary kp-btn-sm" data-action="node-open" data-nid="${e.id}" uk-tooltip="Open the Node">
                    <span uk-icon="icon: sign-in;"></span>
                </button>`:""}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="node-edit" data-nid="${e.id}" uk-tooltip="Edit the Node">
                    <span uk-icon="icon: pencil;"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="node-remove" data-nid="${e.id}" uk-tooltip="Remove the Node">
                    <span uk-icon="icon: trash;"></span>
                </button>
                ${e.status===ze?`
                <button class="uk-button kp-btn-danger kp-btn-sm" data-action="node-force-remove" data-nid="${e.id}" uk-tooltip="Force remove without the child">
                    <span uk-icon="icon: ban;"></span>
                </button>`:""}
            </div>
        </td>
    </tr>`}async function si(e,t,s){let a=e.target.closest("[data-action^='node-']");if(!a)return;e.stopPropagation();let n=s.find(i=>i.id===Number(a.dataset.nid));try{switch(a.dataset.action){case"node-add":{let i=await $s();if(!i)return;let o=await k.post("/nodes",i);de(o.link),d.success("Finish pairing in the new tab"),await se(t);break}case"node-open":{let i=await k.post(`/nodes/${n.id}/sso`);de(i.link);break}case"node-edit":{let i=await Es(n);if(!i)return;let o=await k.put(`/nodes/${n.id}`,i);o?.link?(de(o.link),d.success("Finish the update in the new tab")):d.success("Node updated"),await se(t);break}case"node-remove":{let i=n.status===ze;if(!await P("Remove Node",i?`Unpair ${n.name}? The child opens in a new tab to drop this parent and its synced users.`:`Remove the pending node ${n.name}?`))return;let r=await k.delete(`/nodes/${n.id}`);r?.link?(de(r.link),d.success("Finish unpairing in the new tab")):(d.success("Node removed"),await se(t));break}case"node-force-remove":{if(!await P("Force Remove Node",`Remove ${n.name} here without contacting it? Only for a child that is gone \u2014 a live child keeps trusting this parent until it is unparented on that host.`))return;await k.delete(`/nodes/${n.id}?force=1`),d.success("Node removed"),await se(t);break}}}catch(i){d.error(i.message)}}function de(e){let t=document.createElement("a");t.href=e,t.target="_blank",t.rel="noopener noreferrer",document.body.appendChild(t),t.click(),t.remove()}var ue=null;function ai(e){return`${e.toFixed(1)}%`}var Ve=null;function Le(){return Ve||(Ve=new Promise(e=>{if(window.Chart){e();return}let t=document.createElement("script");t.src="/static/vendor/chartjs/chart.umd.min.js",t.onload=e,t.onerror=e,document.body.appendChild(t)}),Ve)}function vt(e,t){return`
        <div id="stats-panel" data-site-id="${e}" data-site-type="${t}">

            <!-- traffic -->
            <div class="kp-card uk-padding-small uk-margin-bottom">
                <h3 class="kp-view-title uk-margin-small-bottom">Site Traffic
                    <span class="kp-muted uk-text-small" style="font-weight:400"> \u2014 last 24 hours</span>
                </h3>

                <!-- status code badges -->
                <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-small-bottom" uk-grid>
                    <div><div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value" id="stats-2xx" style="font-size:1.6rem">\u2014</div>
                        <div class="kp-stat-label" style="color:var(--kp-success)">2xx Success</div>
                    </div></div>
                    <div><div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value" id="stats-3xx" style="font-size:1.6rem">\u2014</div>
                        <div class="kp-stat-label" style="color:var(--kp-cyan)">3xx Redirect</div>
                    </div></div>
                    <div><div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value" id="stats-4xx" style="font-size:1.6rem">\u2014</div>
                        <div class="kp-stat-label" style="color:var(--kp-warning)">4xx Client Err</div>
                    </div></div>
                    <div><div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value" id="stats-5xx" style="font-size:1.6rem">\u2014</div>
                        <div class="kp-stat-label" style="color:var(--kp-danger)">5xx Server Err</div>
                    </div></div>
                </div>

                <!-- bandwidth -->
                <div class="kp-stats-bandwidth">
                    Total Bandwidth: <span id="stats-bandwidth" class="kp-stats-bandwidth-val">\u2014</span>
                </div>

                <!-- hits per hour chart -->
                <div class="kp-stats-chart-wrap">
                    <canvas id="stats-chart"></canvas>
                </div>
            </div>

            <!-- drilldown modal \u2014 populated on 4xx/5xx bar click -->
            <div id="stats-drilldown-modal" uk-modal>
                <div class="uk-modal-dialog uk-modal-body" style="min-width:min(96vw,900px)">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-small-bottom" id="stats-drilldown-title">Request Detail</h3>
                    <div id="stats-drilldown-body">
                        <div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>
                    </div>
                </div>
            </div>

            <!-- top IPs + UAs -->
            <div class="uk-grid-small uk-child-width-1-1 uk-child-width-1-2@m uk-margin-bottom" uk-grid>
                <div>
                    <div class="kp-table-wrap">
                        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                            <thead><tr>
                                <th style="color:var(--kp-text-dim);font-size:0.75rem">Top IPs</th>
                                <th style="color:var(--kp-text-dim);font-size:0.75rem;text-align:right">Hits</th>
                            </tr></thead>
                            <tbody id="stats-ip-rows">
                                <tr><td colspan="2" class="kp-muted uk-text-small">Loading\u2026</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <div class="kp-table-wrap">
                        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                            <thead><tr>
                                <th style="color:var(--kp-text-dim);font-size:0.75rem">Top User-Agents</th>
                                <th style="color:var(--kp-text-dim);font-size:0.75rem;text-align:right">Hits</th>
                            </tr></thead>
                            <tbody id="stats-ua-rows">
                                <tr><td colspan="2" class="kp-muted uk-text-small">Loading\u2026</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            ${t===6?"":`
        <!-- pod statistics -->
        <div class="kp-card uk-padding-small uk-margin-bottom">
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <h3 class="kp-view-title">Pod Statistics</h3>
                <span id="stats-pod-indicator" class="kp-status kp-status-stopped" style="font-size:0.7rem">
                    Connecting\u2026
                </span>
            </div>
            <div id="stats-pod-table-wrap">
                <div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>
            </div>
        </div>

        <!-- disk usage -->
        <div class="kp-card uk-padding-small uk-margin-bottom">
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <h3 class="kp-view-title">Disk Usage</h3>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="stats-disk-refresh"
                    uk-tooltip="Refresh disk usage">
                    <span uk-icon="refresh"></span>
                </button>
            </div>
            <div id="stats-disk-wrap">
                <div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>
            </div>
        </div>`}

        </div>`}async function ni(e){await Le();let t;try{t=await k.get(`/sites/${e}/stats/traffic`)}catch(i){document.getElementById("stats-ip-rows").innerHTML=`<tr><td colspan="2" class="kp-muted uk-text-small">Failed to load: ${f(i.message)}</td></tr>`;return}document.getElementById("stats-2xx").textContent=(t.status_codes["2xx"]??0).toLocaleString(),document.getElementById("stats-3xx").textContent=(t.status_codes["3xx"]??0).toLocaleString(),document.getElementById("stats-4xx").textContent=(t.status_codes["4xx"]??0).toLocaleString(),document.getElementById("stats-5xx").textContent=(t.status_codes["5xx"]??0).toLocaleString(),document.getElementById("stats-bandwidth").textContent=R(t.total_bandwidth??0);let s=document.getElementById("stats-chart");if(s&&window.Chart){let i=(t.hits_per_hour??[]).map(r=>new Date(r.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));ue&&(ue.destroy(),ue=null),ue=new window.Chart(s,{type:"bar",data:{labels:i,datasets:[{label:"2xx",data:(t.hits_per_hour??[]).map(r=>r["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:(t.hits_per_hour??[]).map(r=>r["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:(t.hits_per_hour??[]).map(r=>r["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:(t.hits_per_hour??[]).map(r=>r["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(r,l)=>{if(!l||!l.length)return;let c=l[0].datasetIndex,u=ue.data.datasets[c].label;if(u!=="4xx"&&u!=="5xx")return;let p=l[0].index,m=document.getElementById("stats-panel");if(!m||!m._hitsPerHour)return;let b=m._hitsPerHour[p]?.hour;b&&yt(`/sites/${e}/stats/drilldown`,b,u)},onHover:(r,l)=>{if(!l||!l.length){r.native.target.style.cursor="default";return}let c=ue.data.datasets[l[0].datasetIndex].label;r.native.target.style.cursor=c==="4xx"||c==="5xx"?"pointer":"default"},plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:r=>{r.native.target.style.cursor="pointer"},onLeave:r=>{r.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}});let o=document.getElementById("stats-panel");o&&(o._hitsPerHour=t.hits_per_hour??[])}let a=document.getElementById("stats-ip-rows");a&&(a.innerHTML=(t.top_ips??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(t.top_ips??[]).map(i=>`
                <tr>
                    <td class="kp-stats-table-cell-mono">${f(i.name)}</td>
                    <td class="kp-stats-table-cell-count">${i.count.toLocaleString()}</td>
                </tr>`).join(""));let n=document.getElementById("stats-ua-rows");n&&(n.innerHTML=(t.top_uas??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(t.top_uas??[]).map(i=>`
                <tr>
                    <td class="kp-stats-ua-cell" title="${f(i.name)}">${f(i.name)}</td>
                    <td class="kp-stats-table-cell-count">${i.count.toLocaleString()}</td>
                </tr>`).join(""))}async function Ts(e){let t=document.getElementById("stats-disk-wrap");if(t){t.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>';try{let s=await k.get(`/sites/${e}/stats/disk`);t.innerHTML=`
            <div class="uk-grid-small uk-child-width-1-2" uk-grid>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${R(s.html_bytes??0)}</div>
                        <div class="kp-stat-label">Site Files</div>
                    </div>
                </div>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${R(s.db_bytes??0)}</div>
                        <div class="kp-stat-label">Database</div>
                    </div>
                </div>
            </div>`}catch(s){t.innerHTML=`<p class="kp-muted uk-text-small">Failed to load disk usage: ${f(s.message)}</p>`}}}function ii(e){return!e||e.length===0?'<p class="kp-muted uk-text-small uk-margin-remove">No container data.</p>':`
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead><tr>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Container</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">CPU</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Memory</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Mem %</th>
            </tr></thead>
            <tbody>${e.map(s=>{let a=s.mem_limit>0?(s.mem_used/s.mem_limit*100).toFixed(1):0,n=a>80,i=s.name.split("-").pop();return`
            <tr>
                <td class="kp-stats-pod-role kp-stats-pod-role-btn"
                    data-container="${s.name}"
                    title="Restart ${i}"
                    style="cursor:pointer">${i}</td>
                <td class="kp-stats-pod-cpu${s.cpu_percent>80?" is-hot":""}">
                    ${ai(s.cpu_percent)}
                </td>
                <td class="kp-stats-pod-mem">
                    ${R(s.mem_used)}
                    <span class="kp-stats-pod-mem-limit"> / ${R(s.mem_limit)}</span>
                </td>
                <td>
                    <div class="kp-stats-mem-wrap">
                        <div class="kp-stats-mem-bar-track">
                            <div class="kp-stats-mem-bar-fill${n?" is-hot":""}"
                                style="width:${a}%"></div>
                        </div>
                        <span class="kp-stats-mem-pct">${a}%</span>
                    </div>
                </td>
            </tr>`}).join("")}</tbody>
        </table>`}function oi(e,t,s,a,n){if(!e||e.length===0)return'<p class="kp-muted uk-text-small">No matching requests found.</p>';let i=[...e].sort((p,m)=>{let b,h;switch(s){case"time":b=p.time,h=m.time;break;case"method":b=p.method,h=m.method;break;case"site":b=p.site_name,h=m.site_name;break;case"ip":b=p.client_ip,h=m.client_ip;break;default:b=p.status,h=m.status;break}return b<h?a?1:-1:b>h?a?-1:1:0}),o=50,r=Math.ceil(i.length/o),c=i.slice(t*o,(t+1)*o).map(p=>{let m=f(p.ua),b=p.status>=500?"kp-badge-danger":"kp-badge-warning";return`
            <tr>
                <td class="kp-stats-table-cell-mono" style="white-space:nowrap">${p.time.slice(11,19)}</td>
                ${n?`<td class="kp-stats-table-cell-mono" style="font-size:0.8rem">${f(p.site_name)}</td>`:""}
                <td class="kp-stats-table-cell-mono">${f(p.method)}</td>
                <td style="word-break:break-all;font-size:0.8rem">${f(p.path)}</td>
                <td><span class="kp-badge ${b}">${p.status}</span>${p.reason?` <span class="kp-badge kp-badge-danger" style="font-size:0.65rem" uk-tooltip="Blocked by security rule">${f(p.reason)}</span>`:""}</td>
                <td class="kp-stats-table-cell-mono">${f(p.client_ip)}</td>
                <td class="kp-dd-ua-cell">${m}</td>
            </tr>`}).join(""),u=r>1?`
        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-top">
            <span class="kp-muted uk-text-small">Page ${t+1} of ${r} \u2014 ${e.length} total</span>
            <div>
                ${t>0?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-dd-page="${t-1}">\u2039 Prev</button>`:""}
                ${t<r-1?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-dd-page="${t+1}">Next \u203A</button>`:""}
            </div>
        </div>`:"";return`
        <div class="kp-table-wrap uk-overflow-auto">
            <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                <thead><tr>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="time">Time ${s==="time"?a?"\u2193":"\u2191":"\u2195"}</th>
                    ${n?`<th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="site">Site ${s==="site"?a?"\u2193":"\u2191":"\u2195"}</th>`:""}
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="method">Method ${s==="method"?a?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem">Path</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="status">Status ${s==="status"?a?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="ip">IP ${s==="ip"?a?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem">UA</th>
                </tr></thead>
                <tbody>${c}</tbody>
            </table>
        </div>
        ${u}`}async function yt(e,t,s,a=!1){let n=document.getElementById("stats-drilldown-modal"),i=document.getElementById("stats-drilldown-title"),o=document.getElementById("stats-drilldown-body");if(!n||!o)return;i.textContent=`${s} Requests \u2014 ${new Date(t).toLocaleString([],{hour:"2-digit",minute:"2-digit",month:"short",day:"numeric"})}`,o.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>',UIkit.modal(n).show();let r=[],l=0,c="time",u=!0;function p(){o.innerHTML=oi(r,l,c,u,a),o.querySelectorAll("th[data-dd-col]").forEach(m=>{m.addEventListener("click",()=>{let b=m.dataset.ddCol;c===b?u=!u:(c=b,u=!0),l=0,p()})}),o.querySelectorAll("[data-dd-page]").forEach(m=>{m.addEventListener("click",()=>{l=parseInt(m.dataset.ddPage,10),p()})})}try{r=await k.get(`${e}${e.includes("?")?"&":"?"}hour=${encodeURIComponent(t)}&status=${s}`)}catch(m){o.innerHTML=`<p class="kp-muted uk-text-small">Failed to load: ${f(m.message)}</p>`;return}p()}function wt(e,t,s){let a=s===6,n=null;function i(){if(a)return;let l=e.querySelector("#stats-pod-indicator"),c=e.querySelector("#stats-pod-table-wrap");if(!c)return;let u=location.protocol==="https:"?"wss":"ws";n=new WebSocket(`${u}://${location.host}/api/sites/${t}/stats/pod`),n.onopen=()=>{l&&(l.className="kp-status kp-status-running",l.textContent="Live")},n.onmessage=p=>{try{let m=JSON.parse(p.data);c.innerHTML=ii(m.containers??[]),c.querySelectorAll(".kp-stats-pod-role-btn").forEach(b=>{b.addEventListener("click",async()=>{let h=b.style.color;b.style.color="var(--kp-warning)";let g=b.dataset.container.split("-").pop();try{await k.post(`/sites/${t}/containers/${g}/restart`),d.success(`${g} restarted`)}catch(v){b.style.color=h,d.error(v.message)}})})}catch{}},n.onerror=()=>{l&&(l.className="kp-status kp-status-error",l.textContent="Error")},n.onclose=()=>{l&&l.textContent==="Live"&&(l.className="kp-status kp-status-stopped",l.textContent="Disconnected")}}function o(){n&&n.readyState===WebSocket.OPEN&&n.close(),n=null}e.querySelector("#stats-disk-refresh")?.addEventListener("click",()=>{Ts(t)}),i();let r=new MutationObserver(()=>{document.getElementById("stats-panel")||(o(),r.disconnect())});r.observe(document.getElementById("main")??document.body,{childList:!0,subtree:!1})}async function xt(e,t){let s=t===6;await ni(e),s||await Ts(e)}async function Cs(e){let t=await k.get("/sites")??[];e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Sites</h1>
            <button class="uk-button kp-btn-primary" id="sites-new-btn" uk-tooltip="Create a New Site">
                <span uk-icon="plus"></span> New
            </button>
        </div>

        <!-- bulk action bar \u2014 always visible -->
        <div id="sites-bulk-bar" class="kp-bulk-bar">
            <div class="kp-bulk-actions">
                <input class="uk-checkbox" type="checkbox" id="sites-select-all" uk-tooltip="Select All">
                <span id="sites-bulk-count" class="kp-bulk-count">0 selected</span>
                <!-- desktop: individual buttons (hidden on mobile) -->
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-start" uk-tooltip="Start the Pod(s)" disabled>
                    <span uk-icon="play"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-stop" uk-tooltip="Stop the Pod(s)" disabled>
                    <span uk-icon="ban"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-restart" uk-tooltip="Restart the Pod(s)" disabled>
                    <span uk-icon="refresh"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-flush" uk-tooltip="Flush the Pod Cache(s)" disabled>
                    <span uk-icon="bolt"></span>
                </button>
                <!-- separator + dangerous bulk action -->
                <span class="uk-visible@s kp-vert-sep" aria-hidden="true"></span>
                <button class="uk-button kp-btn-danger kp-btn-recreate kp-btn-sm uk-visible@s" id="bulk-recreate" uk-tooltip="Recreate the Pod(s)" disabled>
                    <span uk-icon="cloud-download"></span>
                </button>
                <!-- mobile: actions dropdown (hidden on desktop), mirrors Manage dropdown -->
                <li id="kp-bulk-mobile-pill" class="uk-hidden@s" style="position:relative;list-style:none">
                    <a href="javascript:void(0);" class="kp-pill-dropdown-btn" id="kp-bulk-mobile-btn">
                        Actions <span uk-icon="icon: chevron-down; ratio: 0.8"></span>
                    </a>
                    <div class="kp-pill-dropdown" id="kp-bulk-mobile-dropdown" hidden>
                        <a href="#" id="bulk-mobile-start"><span uk-icon="icon: play; ratio: 0.85"></span> Start</a>
                        <a href="#" id="bulk-mobile-stop"><span uk-icon="icon: ban; ratio: 0.85"></span> Stop</a>
                        <a href="#" id="bulk-mobile-restart"><span uk-icon="icon: refresh; ratio: 0.85"></span> Restart</a>
                        <a href="#" id="bulk-mobile-flush"><span uk-icon="icon: bolt; ratio: 0.85"></span> Flush Caches</a>
                        <a href="#" id="bulk-mobile-recreate"><span uk-icon="icon: cloud-download; ratio: 0.85"></span> Recreate</a>
                    </div>
                </li>
            </div>

            <div class="kp-bulk-tools">
                <!-- line 1: sort + direction + reset -->
                <div class="kp-bulk-tools-row">
                    <div class="uk-inline kp-sites-sort">
                        <a class="uk-form-icon kp-sort-dir kp-sort-asc" href="javascript:void(0)" id="sites-sort-dir"
                           uk-icon="icon: arrow-down-arrow-up" uk-tooltip="Toggle Sort Direction" aria-label="Toggle Sort Direction"></a>
                        <select class="uk-select kp-select kp-input-sm" id="sites-sort" uk-tooltip="Sort">
                            <option value="name" selected>Name</option>
                            <option value="status">Status</option>
                            <option value="type">Type</option>
                            <option value="domain">Domain</option>
                        </select>
                    </div>
                    <button class="uk-button kp-btn-secondary kp-btn-icon kp-btn-sm" id="sites-reset" uk-tooltip="Reset Sort & Filters">
                        <span uk-icon="refresh"></span>
                    </button>
                </div>
                <!-- line 2: type + status filters + search -->
                <div class="kp-bulk-tools-row">
                    <select class="uk-select kp-select kp-input-sm kp-sites-filter" id="sites-type" uk-tooltip="Filter by Type">
                        <option value="" selected>All Types</option>
                        ${[...new Set(t.map(s=>s.SiteType))].sort((s,a)=>V(s).localeCompare(V(a))).map(s=>`<option value="${s}">${V(s)}</option>`).join("")}
                    </select>
                    <select class="uk-select kp-select kp-input-sm kp-sites-filter" id="sites-status" uk-tooltip="Filter by Status">
                        <option value="" selected>All Statuses</option>
                        <option value="1">Running</option>
                        <option value="2">Stopped</option>
                        <option value="3">Restarting</option>
                        <option value="4">Error</option>
                    </select>
                    <div class="uk-inline kp-sites-search">
                        <span class="uk-form-icon" uk-icon="icon: search"></span>
                        <input class="uk-input kp-input kp-input-sm"
                               id="sites-search" type="text" placeholder="Filter sites\u2026" autocomplete="off">
                    </div>
                </div>
            </div>
        </div>

        ${t.length===0?ce("world","No sites yet \u2014 create one to get started"):`<div class="kp-list-grid" id="sites-grid">
                ${t.map(s=>li(s,t)).join("")}
            </div>`}`,document.getElementById("sites-new-btn").addEventListener("click",()=>Oe()),ci(),await Le(),window.Chart&&await Promise.allSettled(t.map(s=>ri(s.ID)))}async function ri(e){let t=document.getElementById(`site-traffic-${e}`);if(!t)return;let s=await k.get(`/sites/${e}/stats/traffic`).catch(()=>null);!s?.hits_per_hour?.length||!t.isConnected||(window.Chart.getChart(t)?.destroy(),new window.Chart(t,{type:"bar",data:{labels:s.hits_per_hour.map(a=>new Date(a.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})),datasets:[{label:"2xx",data:s.hits_per_hour.map(a=>a["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderRadius:2},{label:"3xx",data:s.hits_per_hour.map(a=>a["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderRadius:2},{label:"4xx",data:s.hits_per_hour.map(a=>a["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderRadius:2},{label:"5xx",data:s.hits_per_hour.map(a=>a["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderRadius:2}]},options:{responsive:!0,maintainAspectRatio:!1,animation:!1,plugins:{legend:{display:!1},tooltip:{mode:"index",intersect:!1}},scales:{x:{stacked:!0,display:!1},y:{stacked:!0,display:!1,beginAtZero:!0}}}}))}function li(e,t=[]){let s=e.Domains?.[0]??null,a=e.SiteType===6,n=e.ParentID>0?t.find(i=>i.ID===e.ParentID)??null:null;return`
        <div class="kp-list-card" data-site-id="${e.ID}" data-status="${a?"":e.SiteStatus}"
             data-type="${e.SiteType}" data-domain="${s??""}">
            <!-- row checkbox + name -->
            <div class="kp-list-card-header">
                <input class="uk-checkbox kp-site-row-check" type="checkbox"
                       data-site-id="${e.ID}" data-site-type="${e.SiteType}">
                <a class="kp-site-row-name" href="javascript:void(0)"
                   data-action="manage" data-id="${e.ID}">${e.Name}</a>
            </div>

            <!-- details -->
            <div class="kp-list-card-body">
                ${a?"":N("Status",Z(e.SiteStatus))}
                ${N("Type",`${V(e.SiteType)}${!a&&ee(e)?" / "+ee(e):""}`,"kp-muted kp-mono")}
                ${N("Port",`:${e.Port}`,"kp-muted kp-mono")}
                ${N("UID",e.HostUID??"\u2014","kp-muted kp-mono")}
                ${N("Domain",s?`<a href="http://${s}" target="_blank"
                          style="color:var(--kp-cyan)">${s}</a>`:'<span class="kp-muted">\u2014</span>')}
                ${n?N("Clone of",`<span uk-icon="icon: git-fork; ratio: 0.7"></span>
                          <a href="javascript:void(0)" data-action="manage" data-id="${n.ID}"
                             style="color:var(--kp-cyan)">${n.Name}</a>`,"kp-mono"):""}
            </div>

            <!-- site traffic \u2014 last 24 hours -->
            <div style="padding:0 16px 12px">
                <div style="position:relative;height:65px">
                    <canvas id="site-traffic-${e.ID}"></canvas>
                </div>
            </div>

            <!-- action buttons -->
            <div class="kp-list-card-actions">
                <button class="uk-button kp-btn-secondary kp-btn-sm"
                        data-action="manage" data-id="${e.ID}"
                        uk-tooltip="Manage">
                    <span uk-icon="icon: cog;"></span>
                </button>
                ${a?"":`
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
                `}
                <span class="kp-list-card-spacer"></span>
                ${a?"":`
                <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate"
                        data-action="recreate" data-id="${e.ID}"
                        uk-tooltip="Recreate Pod">
                    <span uk-icon="icon: cloud-download;"></span>
                </button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate"
                        data-action="delete" data-id="${e.ID}"
                        uk-tooltip="Delete">
                    <span uk-icon="icon: trash;"></span>
                </button>
            </div>
        </div>`}function Ps(e,t=[]){let s=e.Domains?.[0]??null,a=e.SiteType===6,n=e.ParentID>0?t.find(i=>i.ID===e.ParentID)??null:null;return`
        <div class="kp-site-card uk-margin" data-site-id="${e.ID}" data-status="${a?"":e.SiteStatus}" data-type="${e.SiteType}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${e.ID}">${e.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${e.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${V(e.SiteType)}${!a&&ee(e)?" / "+ee(e):""}</span>
                        ${s?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${s}" target="_blank" style="color:var(--kp-cyan)">${s}</a></span>`:""}
                    </div>
                    ${n?`<div class="kp-site-meta kp-muted uk-text-small uk-margin-small-top"><span uk-icon="icon: git-fork; ratio: 0.75"></span> <a href="javascript:void(0)" data-action="manage" data-id="${n.ID}" style="color:var(--kp-cyan)">${n.Name}</a></div>`:""}
                </div>
                ${a?"":Z(e.SiteStatus)}
            </div>
            <div class="kp-site-actions">
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="manage" data-id="${e.ID}" uk-tooltip="Manage This Site"><span uk-icon="icon: cog;"></span></button>
                ${a?"":`
                ${e.SiteStatus===1?`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="stop" data-id="${e.ID}" uk-tooltip="Stop the Site"><span uk-icon="icon: ban;"></span></button>`:`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="start" data-id="${e.ID}" uk-tooltip="Start the Site"><span uk-icon="icon: play;"></span></button>`}
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="restart" data-id="${e.ID}" uk-tooltip="Restart the Site"><span uk-icon="icon: refresh;"></span></button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="flush" data-id="${e.ID}" title="Flush cache" uk-tooltip="Flush the Caches"><span uk-icon="icon: bolt;"></span></button>
                <div class="kp-site-actions-break"></div>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="recreate" data-id="${e.ID}" title="Recreate pod" uk-tooltip="Recreate the Pod"><span uk-icon="icon: cloud-download;"></span></button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="delete" data-id="${e.ID}" title="Delete" uk-tooltip="Delete the Site"><span uk-icon="icon: trash;"></span></button>
            </div>
        </div>`}function ci(){let e=document.getElementById("sites-bulk-bar"),t=document.getElementById("sites-bulk-count"),s=document.getElementById("sites-select-all"),a=document.getElementById("sites-search"),n=document.getElementById("sites-sort"),i=document.getElementById("sites-type"),o=document.getElementById("sites-status"),r=document.getElementById("sites-sort-dir"),l=document.getElementById("sites-reset"),c=1,u=document.getElementById("sites-grid");if(!e||!s||!u)return;let p=()=>[...document.querySelectorAll(".kp-site-row-check:checked")],m=()=>[...u.querySelectorAll(".kp-site-row-check")].filter(w=>w.closest(".kp-list-card").style.display!=="none"),b=()=>{let T=p().length;t.textContent=`${T} selected`,["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(M=>{let O=document.getElementById(M);O&&(O.disabled=T===0)});let C=document.getElementById("kp-bulk-mobile-btn");C&&(C.disabled=T===0);let $=m();s.indeterminate=T>0&&T<$.length,s.checked=$.length>0&&T===$.length},h=(w,T)=>T==="name"?w.querySelector(".kp-site-row-name")?.textContent.trim().toLowerCase()??"":T==="status"&&w.dataset.type==="6"?"1":(w.dataset[T]??"").toLowerCase(),g=()=>{let w=a.value.trim().toLowerCase(),T=i?.value??"",C=o?.value??"";u.querySelectorAll(".kp-list-card").forEach($=>{let M=(!w||h($,"name").includes(w)||h($,"domain").includes(w))&&(!T||h($,"type")===T)&&(!C||h($,"status")===C);$.style.display=M?"":"none",M||($.querySelector(".kp-site-row-check").checked=!1)}),b()},v=()=>{let w=n?.value??"name",T=[...u.querySelectorAll(".kp-list-card")];T.sort((C,$)=>c*h(C,w).localeCompare(h($,w),void 0,{numeric:!0})||h(C,"name").localeCompare(h($,"name"))),T.forEach(C=>u.appendChild(C))},x=w=>{c=w,r?.classList.toggle("kp-sort-asc",w===1),r?.classList.toggle("kp-sort-desc",w===-1)};s.addEventListener("change",()=>{m().forEach(w=>{w.checked=s.checked}),b()}),u.addEventListener("change",w=>{w.target.classList.contains("kp-site-row-check")&&b()}),a?.addEventListener("input",g),n?.addEventListener("change",v),i?.addEventListener("change",g),o?.addEventListener("change",g),r?.addEventListener("click",w=>{w.preventDefault(),x(-c),v()}),l?.addEventListener("click",()=>{a.value="",i&&(i.value=""),o&&(o.value=""),n&&(n.value="name"),x(1),g(),v()}),["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(w=>{let T=w.replace("bulk-","");document.getElementById(w)?.addEventListener("click",()=>{let C=p().filter($=>$.dataset.siteType!=="6").map($=>$.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:T,ids:C}}))})});let y=document.getElementById("kp-bulk-mobile-pill"),L=document.getElementById("kp-bulk-mobile-dropdown");document.getElementById("kp-bulk-mobile-btn")?.addEventListener("click",w=>{w.stopPropagation(),L.hidden=!L.hidden}),document.addEventListener("click",w=>{L&&!y?.contains(w.target)&&(L.hidden=!0)},{capture:!0}),["start","stop","restart","flush","recreate"].forEach(w=>{document.getElementById(`bulk-mobile-${w}`)?.addEventListener("click",T=>{T.preventDefault(),L.hidden=!0;let C=p().filter($=>$.dataset.siteType!=="6").map($=>$.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:w,ids:C}}))})}),v(),b()}var pe=null,me=null;function di(){me&&(me.close(),me=null);let e=(a,n)=>n>0?`${(a/n*100).toFixed(1)}%`:"\u2014",t=location.protocol==="https:"?"wss":"ws",s=new WebSocket(`${t}://${location.host}/api/stats/host`);me=s,s.onmessage=a=>{let n=document.getElementById("dash-host-cpu");if(!n){s.close();return}let i;try{i=JSON.parse(a.data)}catch{return}n.textContent=`${(i.cpu_percent??0).toFixed(1)}%`,document.getElementById("dash-host-mem").textContent=e(i.mem_used,i.mem_total),document.getElementById("dash-host-mem-sub").textContent=`${R(i.mem_used??0)} / ${R(i.mem_total??0)}`,document.getElementById("dash-host-disk").textContent=e(i.disk_used,i.disk_total),document.getElementById("dash-host-disk-sub").textContent=`${R(i.disk_used??0)} / ${R(i.disk_total??0)}`,document.getElementById("dash-host-procs").textContent=(i.procs_running??0).toLocaleString(),document.getElementById("dash-host-procs-sub").textContent=`of ${(i.procs_total??0).toLocaleString()} threads`},s.onclose=()=>{me===s&&(me=null)}}async function _s(e,t){if(pe&&(pe.destroy(),pe=null),!e?.hits_per_hour?.length)return;await Le();let s=document.getElementById("dash-traffic-chart");!s||!window.Chart||(pe=new window.Chart(s,{type:"bar",data:{labels:e.hits_per_hour.map(a=>new Date(a.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})),datasets:[{label:"2xx",data:e.hits_per_hour.map(a=>a["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:e.hits_per_hour.map(a=>a["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:e.hits_per_hour.map(a=>a["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:e.hits_per_hour.map(a=>a["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(a,n)=>{if(!n||!n.length)return;let i=n[0].datasetIndex,o=pe.data.datasets[i].label;if(o!=="4xx"&&o!=="5xx")return;let r=e.hits_per_hour[n[0].index]?.hour;r&&yt(`/stats/drilldown?scope=${t}`,r,o,!0)},onHover:(a,n)=>{if(!n||!n.length){a.native.target.style.cursor="default";return}let i=pe.data.datasets[n[0].datasetIndex].label;a.native.target.style.cursor=i==="4xx"||i==="5xx"?"pointer":"default"},plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:a=>{a.native.target.style.cursor="pointer"},onLeave:a=>{a.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}}))}async function Is(e){let[t,s,a]=await Promise.all([k.get("/sites").catch(()=>[]),k.get("/stats/traffic").catch(()=>null),window.KP?.user?.role===99?k.get("/nodes").catch(()=>[]):[]]),n=t.filter(c=>c.SiteType!==6&&c.SiteStatus===1).length,i=t.filter(c=>c.SiteType===6).length,o=t.filter(c=>c.SiteType!==6&&c.SiteStatus===4).length,r=window.KP?.user?.role===99,l=a.filter(c=>c.status===2);e.innerHTML=`

        <!-- global counts -->
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
                            <div class="kp-stat-value" style="color:var(--kp-success)">${n}</div>
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
                            <div class="kp-stat-value" style="color:var(--kp-cyan)">${i}</div>
                            <div class="kp-stat-label">Proxies</div>
                        </div>
                        <span style="color:var(--kp-cyan)" uk-icon="icon: link; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-danger)">${o}</div>
                            <div class="kp-stat-label">Errors</div>
                        </div>
                        <span style="color:var(--kp-danger)" uk-icon="icon: warning; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- live host usage \u2014 admin only -->
        ${r?`
        <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-medium-bottom" uk-grid>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" id="dash-host-cpu">\u2014</div>
                            <div class="kp-stat-label">Host CPU</div>
                            <div class="kp-muted uk-text-small kp-mono">&nbsp;</div>
                        </div>
                        <span class="kp-stat-icon" uk-icon="icon: bolt; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" id="dash-host-mem">\u2014</div>
                            <div class="kp-stat-label">Host Memory</div>
                            <div class="kp-muted uk-text-small kp-mono" id="dash-host-mem-sub">&nbsp;</div>
                        </div>
                        <span class="kp-stat-icon" uk-icon="icon: server; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" id="dash-host-disk">\u2014</div>
                            <div class="kp-stat-label">Host Disk</div>
                            <div class="kp-muted uk-text-small kp-mono" id="dash-host-disk-sub">&nbsp;</div>
                        </div>
                        <span class="kp-stat-icon" uk-icon="icon: database; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" id="dash-host-procs">\u2014</div>
                            <div class="kp-stat-label">Running Processes</div>
                            <div class="kp-muted uk-text-small kp-mono" id="dash-host-procs-sub">&nbsp;</div>
                        </div>
                        <span class="kp-stat-icon" uk-icon="icon: list; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
        </div>
        `:""}
        
        <!-- paired nodes \u2014 admin only -->
        ${l.length?`
        <div class="uk-flex uk-flex-wrap uk-margin-medium-bottom" id="dash-nodes" style="gap:8px">
            ${l.map(c=>`
            <button class="uk-button kp-btn-primary kp-btn-sm" data-action="dash-node-open" data-nid="${c.id}" uk-tooltip="Open the Node">
                <span uk-icon="icon: sign-in;"></span> ${f(c.name)}
            </button>`).join("")}
        </div>
        `:""}

        <!-- global traffic -->
        <div class="kp-view-header uk-margin-top">
            <h2 class="kp-view-title" style="font-size:1.25rem">Traffic
                <span class="kp-muted uk-text-small" style="font-weight:400"> \u2014 last 24 hours</span>
            </h2>
            ${r?`
            <div id="dash-traffic-scope" class="uk-flex" style="gap:6px">
                ${[["all","All"],["sites","Sites"],["panel","Panel"]].map(([c,u])=>`
                <button class="uk-button ${c==="all"?"kp-btn-primary":"kp-btn-ghost"} kp-btn-sm"
                    data-action="dash-scope" data-scope="${c}">${u}</button>`).join("")}
            </div>
            `:""}
        </div>
        <div class="kp-card uk-padding-small uk-margin-medium-bottom">
            <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-small-bottom" uk-grid>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" id="dash-traffic-2xx" style="font-size:1.6rem;color:var(--kp-success)">
                        ${(s?.status_codes?.["2xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-success)">2xx Success</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" id="dash-traffic-3xx" style="font-size:1.6rem;color:var(--kp-cyan)">
                        ${(s?.status_codes?.["3xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-cyan)">3xx Redirect</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" id="dash-traffic-4xx" style="font-size:1.6rem;color:var(--kp-warning)">
                        ${(s?.status_codes?.["4xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-warning)">4xx Client Err</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" id="dash-traffic-5xx" style="font-size:1.6rem;color:var(--kp-danger)">
                        ${(s?.status_codes?.["5xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-danger)">5xx Server Err</div>
                </div></div>
            </div>
            <div class="uk-margin-small-bottom" style="color:var(--kp-text-dim);font-size:0.85rem">
                Total Bandwidth:
                <span id="dash-traffic-bw" style="color:var(--kp-cyan);font-family:'JetBrains Mono',monospace">
                    ${R(s?.total_bandwidth??0)}
                </span>
            </div>
            <div style="position:relative;height:180px">
                <canvas id="dash-traffic-chart"></canvas>
            </div>
        </div>

        <!-- drilldown modal \u2014 populated on 4xx/5xx bar click -->
        <div id="stats-drilldown-modal" uk-modal>
            <div class="uk-modal-dialog uk-modal-body" style="min-width:min(96vw,900px)">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title uk-margin-small-bottom" id="stats-drilldown-title">Request Detail</h3>
                <div id="stats-drilldown-body">
                    <div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>
                </div>
            </div>
        </div>

        <!-- global pod aggregate + top sites -->
        <div class="uk-grid-small uk-child-width-1-1 uk-child-width-1-2@m uk-margin-medium-bottom" uk-grid>
            <div>

                <!-- recent sites -->
                <div class="kp-view-header">
                    <h2 class="kp-view-title" style="font-size:1.25rem">Recent Sites</h2>
                </div>
                <div class="">
                    ${t.length===0?emptyState("world","No sites yet"):t.slice(-3).reverse().map(c=>Ps(c,t)).join("")}
                </div>

            </div>
            <div>

                <!-- top traffic sites -->
                <div class="kp-view-header">
                    <h2 class="kp-view-title" style="font-size:1.25rem">Top Sites by Traffic</h2>
                </div>
                <div class="kp-table-wrap">
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <thead><tr>
                            <th style="color:var(--kp-text-dim);font-size:0.75rem">Host</th>
                            <th style="color:var(--kp-text-dim);font-size:0.75rem;text-align:right">Hits</th>
                        </tr></thead>
                        <tbody>
                            ${(s?.top_sites??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No traffic data</td></tr>':(s?.top_sites??[]).map(c=>`
                                    <tr>
                                        <td class="kp-mono" style="font-size:0.8rem">${f(c.name)}</td>
                                        <td style="text-align:right;color:var(--kp-cyan);
                                            font-family:'JetBrains Mono',monospace;font-size:0.8rem">
                                            ${c.count.toLocaleString()}
                                        </td>
                                    </tr>`).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `,r&&di(),document.getElementById("dash-nodes")?.addEventListener("click",async c=>{let u=c.target.closest('[data-action="dash-node-open"]');if(u)try{let p=await k.post(`/nodes/${u.dataset.nid}/sso`);de(p.link)}catch(p){d.error(p.message)}}),await _s(s,"all"),document.getElementById("dash-traffic-scope")?.addEventListener("click",async c=>{let u=c.target.closest('[data-action="dash-scope"]');if(!u||u.classList.contains("kp-btn-primary"))return;let p=u.dataset.scope,m;try{m=await k.get(`/stats/traffic?scope=${p}`)}catch(b){d.error(b.message);return}u.parentElement.querySelectorAll('[data-action="dash-scope"]').forEach(b=>{b.classList.toggle("kp-btn-primary",b===u),b.classList.toggle("kp-btn-ghost",b!==u)});for(let b of["2xx","3xx","4xx","5xx"])document.getElementById(`dash-traffic-${b}`).textContent=(m?.status_codes?.[b]??0).toLocaleString();document.getElementById("dash-traffic-bw").textContent=R(m?.total_bandwidth??0),await _s(m,p)}),document.getElementById("dash-new-site")?.addEventListener("click",()=>Oe())}function Te(e=null){let t=e?`/sites/${e}/security/ip`:"/security/ip",s=e?`/sites/${e}/security/ua`:"/security/ua",a=e?`/sites/${e}/security/country`:"/security/country",n=e?`/sites/${e}/security/asn`:"/security/asn";return`
        <div id="security-panel" data-ip-base="${t}" data-ua-base="${s}" data-geo-base="${a}" data-asn-base="${n}" ${e?`data-site-id="${e}"`:""}>

            <!-- tab pills -->
            <ul class="kp-tab-pills" id="kp-sec-pills">
                <li data-tab="ip"><a href="#"><span uk-icon="icon: location; ratio: 0.85"></span> IP Rules</a></li>
                <li data-tab="ua"><a href="#"><span uk-icon="icon: laptop; ratio: 0.85"></span> User-Agent</a></li>
                <li data-tab="country"><a href="#"><span uk-icon="icon: world; ratio: 0.85"></span> Country</a></li>
                <li data-tab="asn"><a href="#"><span uk-icon="icon: server; ratio: 0.85"></span> ASN</a></li>
                ${e?`
                <li data-tab="malware"><a href="#"><span uk-icon="icon: bolt; ratio: 0.85"></span> Malware</a></li>
                `:""}
                ${e?"":`
                <li data-tab="proxies"><a href="#"><span uk-icon="icon: link; ratio: 0.85"></span> Trusted Proxies</a></li>
                <li data-tab="bypass"><a href="#"><span uk-icon="icon: unlock; ratio: 0.85"></span> Bypass</a></li>
                `}
            </ul>

            <!-- switcher panels -->
            <ul class="uk-switcher uk-margin-large-bottom" id="kp-sec-switcher">

                <!-- ip rules -->
                <li>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        <span uk-icon="icon: warning; ratio: 0.75"></span>
                        The Spamhaus DROP lists are enforced alongside these rules on every
                        request. Whitelist an IP here to allow it through regardless.
                        <a href="https://www.spamhaus.org/blocklists/do-not-route-or-peer/" target="_blank" rel="noopener">
                            About Spamhaus DROP
                        </a>
                    </p>
                    <div class="kp-card uk-padding-small">
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
                            A whitelisted IP is allowed outright, ahead of both the global and
                            per-site blacklists. Whitelist is disabled when empty.
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
                </li>

                <!-- user-agent rules -->
                <li>
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
                </li>

                <!-- country rules -->
                <li>
                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Country Rules</h3>
                            <div class="uk-flex" style="gap:8px">
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-geo-save" uk-tooltip="Save the Country Rules">
                                    <span uk-icon="check"></span>
                                </button>
                            </div>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            One ISO 3166-1 alpha-2 country code per line (e.g. <span class="kp-mono">US</span>
                            or <span class="kp-mono">DE</span>).
                            Blacklist always wins. Whitelist is disabled when empty.
                            Unresolvable IPs (private ranges, unknown) are always allowed.
                        </p>
                        <div class="uk-grid-small" uk-grid>
                            <div class="uk-width-1-2@s">
                                <label class="kp-label">
                                    <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                                    Whitelist
                                </label>
                                <textarea class="uk-textarea kp-textarea" id="sec-geo-whitelist" rows="6"
                                    placeholder="# allow only these countries&#10;US&#10;CA"></textarea>
                            </div>
                            <div class="uk-width-1-2@s">
                                <label class="kp-label">
                                    <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                                    Blacklist
                                </label>
                                <textarea class="uk-textarea kp-textarea" id="sec-geo-blacklist" rows="6"
                                    placeholder="# block these countries&#10;CN&#10;RU"></textarea>
                            </div>
                        </div>
                    </div>
                </li>

                <!-- asn rules -->
                <li>
                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">ASN Rules</h3>
                            <div class="uk-flex uk-flex-middle" style="gap:8px">
                                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sec-asn-lookup" uk-tooltip="Look up the ASN for an IP or domain">
                                    <span uk-icon="eye"></span>
                                </button>
                                <div style="width:1px;align-self:stretch;background:var(--kp-border)"></div>
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-asn-save" uk-tooltip="Save the ASN Rules">
                                    <span uk-icon="check"></span>
                                </button>
                            </div>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            One autonomous system number per line (e.g. <span class="kp-mono">AS15169</span>
                            or <span class="kp-mono">15169</span>).
                            Blacklist always wins. Whitelist is disabled when empty.
                            Unresolvable IPs (private ranges, unknown) are always allowed.
                        </p>
                        <div class="uk-grid-small" uk-grid>
                            <div class="uk-width-1-2@s">
                                <label class="kp-label">
                                    <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                                    Whitelist
                                </label>
                                <textarea class="uk-textarea kp-textarea" id="sec-asn-whitelist" rows="6"
                                    placeholder="# allow only these networks&#10;AS7922&#10;AS20115"></textarea>
                            </div>
                            <div class="uk-width-1-2@s">
                                <label class="kp-label">
                                    <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                                    Blacklist
                                </label>
                                <textarea class="uk-textarea kp-textarea" id="sec-asn-blacklist" rows="6"
                                    placeholder="# block these networks&#10;AS16509&#10;AS14061"></textarea>
                            </div>
                        </div>
                    </div>
                </li>

                ${e?`
                <!-- malware scans -->
                <li>
                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Malware Scans</h3>
                            <div class="uk-flex" style="gap:8px">
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-malware-scan" uk-tooltip="Scan this site now" disabled>
                                    <span uk-icon="search"></span>
                                </button>
                            </div>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            The site's html directory is scanned nightly at midnight with ClamAV and Linux Malware Detect.
                            Findings are reported only \u2014 quarantine moves a file out of
                            the site and out of SFTP reach. History is kept for <span id="sec-malware-retain">30</span> days.
                        </p>
                        <div id="sec-malware-list">
                            <div uk-spinner="ratio: 0.6"></div>
                        </div>
                    </div>
                </li>
                `:""}

                ${e?"":`
                <!-- trusted proxy ranges -->
                <li>
                    <div class="kp-card uk-padding-small">
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
                        <textarea class="uk-textarea kp-textarea kp-mono" id="sec-tp-cidrs" rows="12"
                            placeholder="192.168.1.0/24"></textarea>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            One IPv4 or IPv6 CIDR per line. Auto-fetched provider ranges are
                            managed automatically and do not need to be entered here.
                        </p>
                    </div>
                </li>

                <!-- security bypass -->
                <li>
                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Security Bypass</h3>
                            <div class="uk-flex" style="gap:8px">
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-bypass-save" uk-tooltip="Save Bypass Rules">
                                    <span uk-icon="check"></span>
                                </button>
                            </div>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            IPs or CIDRs that skip all security checks (IP rules, UA rules, WAF).
                            Use for trusted services that must not be blocked. Supports inline
                            notes with <code>#</code> e.g. <code>1.2.3.4/32 # WP Umbrella</code>
                        </p>
                        <textarea class="uk-textarea kp-textarea kp-mono" id="sec-bypass-cidrs" rows="12"
                            placeholder="1.2.3.4/32 # WP Umbrella&#10;2001:db8::/32 # monitoring"></textarea>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            One IPv4, IPv6, or CIDR per line. Bypassed IPs are still proxied normally \u2014 only enforcement is skipped.
                        </p>
                    </div>
                </li>
                `}

            </ul>
        </div>`}function Je(e,t){let s=e.querySelector("#security-panel"),a=e.querySelector("#kp-sec-pills"),n=e.querySelector("#kp-sec-switcher");if(!s||!a||!n)return;let i=s.dataset.siteId,o=[...a.querySelectorAll(":scope > li")],r=(l,c)=>{if(UIkit.switcher(n).show(l),o.forEach((p,m)=>p.classList.toggle("kp-pill-active",m===l)),!c)return;let u=o[l].dataset.tab;history.replaceState(null,"",i?`#site-detail/${i}/${u}`:l===0?"#security":`#security/${u}`)};o.forEach((l,c)=>{l.querySelector(":scope > a").addEventListener("click",u=>{u.preventDefault(),r(c,!0)})}),r(Math.max(0,o.findIndex(l=>l.dataset.tab===t)),!1)}async function ae(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,a=t.dataset.uaBase;try{let n=t.dataset.geoBase,i=t.dataset.asnBase,o=[k.get(s),k.get(a),k.get(n),k.get(i)];t.dataset.siteId||o.push(k.get("/settings/trusted-proxies"),k.get("/security/bypass"));let[r,l,c,u,p,m]=await Promise.all(o);if(!e.querySelector("#sec-ip-whitelist"))return;if(e.querySelector("#sec-ip-whitelist").value=r.whitelist??"",e.querySelector("#sec-ip-blacklist").value=r.blacklist??"",e.querySelector("#sec-ua-whitelist").value=l.whitelist??"",e.querySelector("#sec-ua-blacklist").value=l.blacklist??"",e.querySelector("#sec-geo-whitelist").value=c.whitelist??"",e.querySelector("#sec-geo-blacklist").value=c.blacklist??"",e.querySelector("#sec-asn-whitelist").value=u.whitelist??"",e.querySelector("#sec-asn-blacklist").value=u.blacklist??"",p){let b=e.querySelector("#sec-tp-cidrs");b&&(b.value=p.trusted_proxies_custom??"")}if(m){let b=e.querySelector("#sec-bypass-cidrs");b&&(b.value=m.bypass??"")}}catch(n){d.error("Failed to load security rules: "+n.message)}t.dataset.siteId&&Ke(e,t.dataset.siteId)}var ui={1:["restarting","Running"],2:["running","Clean"],3:["error","Infected"],4:["stopped","Failed"]},Bs=null;function pi(e){return e.scannable?e.scans.length?`
        <div class="uk-overflow-auto">
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead>
                <tr>
                    <th>Started</th>
                    <th>Trigger</th>
                    <th>Status</th>
                    <th>Files</th>
                    <th>Hits</th>
                </tr>
            </thead>
            <tbody>${e.scans.map(s=>{let[a,n]=ui[s.status]||["stopped","Unknown"],i=s.status===1,o=(s.findings||[]).map(r=>`
            <tr>
                <td colspan="4" style="padding-left:24px">
                    <div class="kp-mono" style="font-size:0.8rem">${f(r.path)}</div>
                    <div class="kp-muted uk-text-small">${f(r.signature)}</div>
                </td>
                <td>
                    ${r.quarantined?'<span class="kp-muted uk-text-small">Quarantined</span>':`<button class="uk-button kp-btn-danger kp-btn-sm sec-malware-quarantine" data-id="${r.id}" uk-tooltip="Move this file into quarantine">
                               <span uk-icon="lock"></span>
                           </button>`}
                </td>
            </tr>`).join("");return`
            <tr>
                <td>${new Date(s.started).toLocaleString()}</td>
                <td>${s.trigger==="manual"?"Manual":"Scheduled"}</td>
                <td>
                    <span class="kp-status kp-status-${a}">${n}</span>
                    ${s.error?`<div class="kp-muted uk-text-small">${f(s.error)}</div>`:""}
                </td>
                <td>${i?"\u2014":s.files_scanned}</td>
                <td>${i?"\u2014":s.infected}</td>
            </tr>${o}`}).join("")}</tbody>
        </table>
        </div>`:'<p class="kp-muted uk-text-small uk-margin-remove">No scans yet.</p>':'<p class="kp-muted uk-text-small uk-margin-remove">This site has no html directory to scan.</p>'}async function Ke(e,t){if(clearTimeout(Bs),!!e.querySelector("#sec-malware-list"))try{let s=await k.get(`/sites/${t}/malware`),a=e.querySelector("#sec-malware-list");if(!a)return;let n=s.scans.some(i=>i.status===1);a.innerHTML=pi(s),e.querySelector("#sec-malware-scan").disabled=!s.scannable||n,e.querySelector("#sec-malware-retain").textContent=s.retain_days,n&&(Bs=setTimeout(()=>Ke(e,t),1e4))}catch(s){d.error("Failed to load malware scans: "+s.message)}}function Xe(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,a=t.dataset.uaBase,n=t.dataset.geoBase;e.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-ip-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put(s,{whitelist:e.querySelector("#sec-ip-whitelist").value,blacklist:e.querySelector("#sec-ip-blacklist").value}),d.success("IP rules saved")}catch(r){d.error(r.message)}finally{i.disabled=!1,i.innerHTML=o}}),e.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-ua-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put(a,{whitelist:e.querySelector("#sec-ua-whitelist").value,blacklist:e.querySelector("#sec-ua-blacklist").value}),d.success("UA rules saved")}catch(r){d.error(r.message)}finally{i.disabled=!1,i.innerHTML=o}}),e.querySelector("#sec-geo-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-geo-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let r={whitelist:e.querySelector("#sec-geo-whitelist").value,blacklist:e.querySelector("#sec-geo-blacklist").value},l=await k.put(n,r);l?.status==="confirm"&&(await UIkit.modal.confirm(`${l.reason}. Save anyway?`),l=await k.put(n,{...r,confirm:!0})),d.success("Country rules saved")}catch(r){r instanceof Error&&d.error(r.message)}finally{i.disabled=!1,i.innerHTML=o}}),e.querySelector("#sec-asn-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-asn-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let r=e.querySelector("#security-panel").dataset.asnBase,l={whitelist:e.querySelector("#sec-asn-whitelist").value,blacklist:e.querySelector("#sec-asn-blacklist").value},c=await k.put(r,l);c?.status==="confirm"&&(await UIkit.modal.confirm(`${c.reason}. Save anyway?`),c=await k.put(r,{...l,confirm:!0})),d.success("ASN rules saved")}catch(r){r instanceof Error&&d.error(r.message)}finally{i.disabled=!1,i.innerHTML=o}}),e.querySelector("#sec-asn-lookup")?.addEventListener("click",()=>mi(e)),e.querySelector("#sec-malware-scan")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-malware-scan"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.post(`/sites/${t.dataset.siteId}/malware/scan`),d.success("Malware scan queued"),await Ke(e,t.dataset.siteId)}catch(r){d.error(r.message),i.disabled=!1}finally{i.innerHTML=o}}),e.querySelector("#sec-malware-list")?.addEventListener("click",async i=>{let o=i.target.closest(".sec-malware-quarantine");if(!(!o||!await P("Quarantine File","This moves the file out of the site's html directory. If it is legitimately needed, the site may break. Continue?"))){o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.post(`/sites/${t.dataset.siteId}/malware/findings/${o.dataset.id}/quarantine`),d.success("File quarantined")}catch(l){d.error(l.message)}finally{await Ke(e,t.dataset.siteId)}}}),e.querySelector("#sec-tp-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-tp-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put("/settings/trusted-proxies",{trusted_proxies_custom:e.querySelector("#sec-tp-cidrs").value.trim()}),d.success("Trusted proxy ranges saved")}catch(r){d.error(r.message)}finally{i.disabled=!1,i.innerHTML=o}}),e.querySelector("#sec-bypass-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-bypass-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put("/security/bypass",{bypass:e.querySelector("#sec-bypass-cidrs").value.trim()}),d.success("Bypass rules saved")}catch(r){d.error(r.message)}finally{i.disabled=!1,i.innerHTML=o}}),e.querySelector("#sec-tp-import")?.addEventListener("change",async i=>{let o=i.target.files[0];if(!o)return;let r=new FormData;r.append("file",o);try{let l=await fetch("/api/settings/trusted-proxies/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:r}),c=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(c?.error||`HTTP ${l.status}`);await ae(e),d.success("Trusted proxies imported")}catch(l){d.error(l.message)}finally{i.target.value=""}}),e.querySelector("#sec-ip-import")?.addEventListener("change",async i=>{let o=i.target.files[0];if(!o)return;let r=new FormData;r.append("file",o);try{let l=await fetch("/api"+s+"/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:r}),c=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(c?.error||`HTTP ${l.status}`);await ae(e),d.success("IP rules imported")}catch(l){d.error(l.message)}finally{i.target.value=""}}),e.querySelector("#sec-ua-import")?.addEventListener("change",async i=>{let o=i.target.files[0];if(!o)return;let r=new FormData;r.append("file",o);try{let l=await fetch("/api"+a+"/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:r}),c=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(c?.error||`HTTP ${l.status}`);await ae(e),d.success("UA rules imported")}catch(l){d.error(l.message)}finally{i.target.value=""}})}function mi(e){document.getElementById("kp-asn-lookup-modal")?.remove(),document.body.insertAdjacentHTML("beforeend",`
        <div id="kp-asn-lookup-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">ASN Lookup</h3>
                <div class="uk-flex uk-margin-top" style="gap:8px">
                    <input class="uk-input kp-input" id="asn-lookup-q" type="text" placeholder="IP address or domain">
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="asn-lookup-go" uk-tooltip="Look it up">
                        <span uk-icon="search"></span>
                    </button>
                </div>
                <div id="asn-lookup-result" class="uk-margin-top"></div>
            </div>
        </div>`);let s=UIkit.modal("#kp-asn-lookup-modal");s.show();let a=e.querySelector("#security-panel")?.dataset.siteId,n=a?`/sites/${a}/security/asn/lookup`:"/security/asn/lookup",i=async()=>{let o=document.getElementById("asn-lookup-q").value.trim();if(!o)return;let r=document.getElementById("asn-lookup-result");r.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let l=await k.get(`${n}?q=${encodeURIComponent(o)}`);if(!l?.asn){r.innerHTML='<p class="kp-muted uk-text-small">No ASN found for <span class="kp-mono"></span>.</p>',r.querySelector(".kp-mono").textContent=l?.ip||o;return}r.innerHTML=`
                <p class="uk-text-small">
                    <span class="kp-mono" id="asn-lookup-ip"></span> \u2192
                    <span class="kp-mono">AS${l.asn}</span>
                    <span id="asn-lookup-org"></span>
                    ${l.country?`<span class="kp-muted">(${l.country})</span>`:""}
                </p>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="asn-lookup-add">
                    <span uk-icon="ban"></span> Add AS${l.asn} to blacklist
                </button>`,r.querySelector("#asn-lookup-ip").textContent=l.ip,r.querySelector("#asn-lookup-org").textContent=l.org||"",r.querySelector("#asn-lookup-add").addEventListener("click",()=>{let c=e.querySelector("#sec-asn-blacklist"),u=`AS${l.asn}`;c.value.split(`
`).some(p=>p.trim().toUpperCase()===u)||(c.value=c.value.trim()?`${c.value.replace(/\s+$/,"")}
${u}`:u),s.hide(),d.success(`${u} added to blacklist \u2014 save to apply`)})}catch(l){r.innerHTML="",d.error(l.message)}};document.getElementById("asn-lookup-go").addEventListener("click",i),document.getElementById("asn-lookup-q").addEventListener("keydown",o=>{o.key==="Enter"&&i()})}async function qs(e,t={}){if(!H()){e.innerHTML=D("Access denied");return}e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 except for IP rules, where a whitelist match
            in either scope allows the request outright.
        </p>
        ${Te(null)}`,Xe(e),Je(e,t.tab),ae(e)}function Ms(e,t){return new Promise(s=>{let a=document.createElement("div");a.className="uk-flex-top",a.innerHTML=`
            <div class="uk-modal-dialog uk-modal-body kp-modal uk-margin-auto-vertical" style="max-width:420px">
                <h3 class="uk-modal-title"></h3>
                <form class="uk-form-stacked">
                    <label class="kp-label">
                        <span></span>
                        <input class="uk-input kp-input" type="password" autocomplete="off" required autofocus>
                    </label>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" type="button">Cancel</button>
                        <button class="uk-button kp-btn-primary" type="submit">Continue</button>
                    </div>
                </form>
            </div>`,a.querySelector(".uk-modal-title").textContent=e,a.querySelector("label span").textContent=t;let n=a.querySelector("input");document.body.append(a);let i=UIkit.modal(a),o=null;a.querySelector("form").addEventListener("submit",r=>{r.preventDefault(),o=n.value,n.value="",i.hide()}),a.addEventListener("hidden",()=>{n.value="",i.$destroy(!0),s(o)},{once:!0}),i.show()})}async function As(e,t,s){let a={"X-CSRF-Token":window.KP?.csrf??""};s&&(a["Content-Type"]=s);let n=await fetch(e,{method:"POST",headers:a,body:t});if(!n.ok){let i=await n.json().catch(()=>null);throw new Error(i?.error||`HTTP ${n.status}`)}return n}async function ke(e,t){let s=await Ms("Export Encrypted Settings","Passphrase (at least 12 characters)");if(s===null)return;let a=await As(e,JSON.stringify({passphrase:s}),"application/json"),n=URL.createObjectURL(await a.blob()),i=document.createElement("a");i.href=n,i.download=t,i.click(),setTimeout(()=>URL.revokeObjectURL(n),1e3)}async function be(e,t){let s=await Ms("Import Encrypted Settings","Passphrase");if(s===null)return null;let a=new FormData;return a.append("file",t),a.append("passphrase",s),(await As(e,a)).json()}function ki(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';case"expired":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Expired certificate"></span>';case"mismatch":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Certificate does not match this domain"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function Rs(e){let t=document.getElementById("admin-domain-ssl");if(!(!t||!e))try{let s=await k.get(`/ssl-status?domain=${encodeURIComponent(e)}`);t.outerHTML=ki(s.status)}catch{}}var Ds=["general","backups","notifications","malware"];function Ge(e){return`
        <div class="uk-flex" style="gap:8px">
            <button type="button" class="uk-button kp-btn-ghost kp-btn-sm kp-settings-export" data-group="${e}" uk-tooltip="Export encrypted settings">
                <span uk-icon="download"></span>
            </button>
            <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import encrypted settings">
                <span uk-icon="upload"></span>
                <input type="file" class="kp-settings-import" data-group="${e}" accept=".pnm" style="display:none">
            </label>
        </div>`}async function St(e,t={}){if(!H()){e.innerHTML=D("Access denied");return}let[s,a,n,i,o]=await Promise.all([k.get("/settings"),k.get("/settings/backup"),k.get("/settings/notifications"),k.get("/settings/resources"),k.get("/settings/malware")]);e.innerHTML=`
    <div class="kp-view-header">
        <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Settings</h1>
    </div>

    <!-- tab pills -->
    <ul class="kp-tab-pills" id="kp-settings-pills">
        <li data-pill="0"><a href="#"><span uk-icon="icon: cog; ratio: 0.85"></span> General</a></li>
        <li data-pill="1"><a href="#"><span uk-icon="icon: cloud-upload; ratio: 0.85"></span> Backups</a></li>
        <li data-pill="2"><a href="#"><span uk-icon="icon: bell; ratio: 0.85"></span> Notifications</a></li>
        <li data-pill="3"><a href="#"><span uk-icon="icon: bolt; ratio: 0.85"></span> Malware</a></li>
    </ul>

    <!-- switcher panels -->
    <ul class="uk-switcher uk-margin-large-bottom" id="kp-settings-switcher">

        <!-- general: panel configuration + host resource watcher -->
        <li>
            <div class="kp-card uk-padding">
                <div class="uk-flex uk-flex-right uk-margin-bottom">
                    ${Ge("general")}
                </div>
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
                                value="${s.admin_domain??""}">
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            When set, the proxy will route this domain to the management UI and issue
                            a Let's Encrypt certificate automatically. Leave blank to disable.
                        </p>
                    </div>

                    <h3 class="kp-view-title uk-margin-bottom uk-margin-top">Host Resource Watcher</h3>
                    <div class="uk-grid-small uk-child-width-1-2@m" uk-grid>
                        <div>
                            <label class="kp-label" for="resource-ram-reserve">RAM Reserve (GB)</label>
                            <input class="uk-input kp-input" id="resource-ram-reserve" name="resource_ram_reserve_gb" type="number"
                                min="0.5" max="64" step="0.5" placeholder="2"
                                value="${i.resource_ram_reserve_gb??"2"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                Amount of RAM to keep free for the host OS. Throttling fires when aggregate pod usage exceeds total RAM minus this value.
                            </p>
                        </div>
                        <div>
                            <label class="kp-label" for="resource-poll-interval">Poll Interval (seconds)</label>
                            <input class="uk-input kp-input" id="resource-poll-interval" name="resource_poll_interval" type="number"
                                min="5" max="300" step="5" placeholder="30"
                                value="${i.resource_poll_interval??"30"}">
                        </div>
                        <div>
                            <label class="kp-label" for="resource-throttle-pct">Throttle Aggressiveness (%)</label>
                            <input class="uk-input kp-input" id="resource-throttle-pct" name="resource_throttle_pct" type="number"
                                min="10" max="90" step="5" placeholder="50"
                                value="${i.resource_throttle_pct??"50"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                Percentage to reduce the offending pod's current memory usage by when throttling.
                            </p>
                        </div>
                        <div>
                            <label class="kp-label" for="shutdown-job-timeout">Shutdown Job Drain (minutes)</label>
                            <input class="uk-input kp-input" id="shutdown-job-timeout" name="shutdown_job_timeout" type="number"
                                min="1" max="60" step="1" placeholder="5"
                                value="${i.shutdown_job_timeout??"5"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                How long to wait for in-flight backups, restores, and imports to finish before the process exits on stop or restart.
                            </p>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label" for="resource-webhook-url">Webhook URL <span class="kp-muted">(optional)</span></label>
                            <input class="uk-input kp-input kp-mono" id="resource-webhook-url" name="resource_webhook_url" type="url"
                                placeholder="${i.resource_webhook_url?"saved \u2014 enter a URL to replace it":"https://hooks.example.com/notify"}">
                            <label><input type="checkbox" name="clear_webhook"> Remove saved webhook</label>
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                HTTP POST with JSON payload on threshold breach and resolution. Compatible with Uptime Kuma, PagerDuty, Slack, etc.
                            </p>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </li>

        <!-- backups: schedule/retention + S3 storage -->
        <li>
            <div class="kp-card uk-padding">
                <div class="uk-flex uk-flex-right uk-margin-bottom">
                    ${Ge("backups")}
                </div>
                <form id="backup-form" class="uk-form-stacked">
                    <div class="uk-grid-medium uk-child-width-1-2@m" uk-grid>
                        <div>
                            <h4 class="kp-view-title uk-margin-bottom">Schedule</h4>
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
                        </div>
                        <div>
                            <h4 class="kp-view-title uk-margin-bottom">S3 Storage</h4>
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
                                    placeholder="${a.s3_access_key?"saved \u2014 enter a new ID to change":"AKIAIOSFODNN7EXAMPLE"}">
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
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </li>

        <!-- notifications: smtp + aws sns -->
        <li>
            <div class="kp-card uk-padding">
                <div class="uk-flex uk-flex-right uk-flex-middle uk-margin-bottom">
                    ${Ge("notifications")}
                </div>
                <form id="notifications-form" class="uk-form-stacked">
                    <div class="uk-grid-medium uk-child-width-1-2@m" uk-grid>
                        <div>
                            <h4 class="kp-view-title uk-margin-bottom">Email (SMTP)</h4>
                            <div class="uk-margin">
                                <label class="kp-label" for="smtp-host">SMTP Host</label>
                                <input class="uk-input kp-input kp-mono" id="smtp-host" name="smtp_host" type="text"
                                    placeholder="smtp.example.com" value="${n.smtp_host??""}">
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="smtp-port">Port</label>
                                <input class="uk-input kp-input kp-mono" id="smtp-port" name="smtp_port" type="text"
                                    placeholder="587" value="${n.smtp_port??""}">
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="smtp-username">Username</label>
                                <input class="uk-input kp-input kp-mono" id="smtp-username" name="smtp_username" type="text"
                                    placeholder="user@example.com" value="${n.smtp_username??""}">
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="smtp-password">Password</label>
                                <input class="uk-input kp-input kp-mono" id="smtp-password" name="smtp_password" type="password"
                                    placeholder="${n.smtp_password?"saved \u2014 enter new value to change":"enter password"}"
                                    value="">
                                <p class="kp-muted uk-text-small uk-margin-small-top">Leave blank to keep the existing password.</p>
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="smtp-from">From Address</label>
                                <input class="uk-input kp-input kp-mono" id="smtp-from" name="smtp_from" type="email"
                                    placeholder="podnest@example.com" value="${n.smtp_from??""}">
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label">
                                    <input class="uk-checkbox" type="checkbox" id="smtp-tls" name="smtp_tls"
                                        ${n.smtp_tls==="true"||n.smtp_tls==="1"?"checked":""}>
                                    &nbsp;Use implicit TLS (port 465)
                                </label>
                                <p class="kp-muted uk-text-small uk-margin-small-top">
                                    Unchecked uses STARTTLS (port 587). Check only for port 465 / SSL-only servers.
                                </p>
                            </div>
                        </div>
                        <div>
                            <h4 class="kp-view-title uk-margin-bottom">SMS (AWS SNS)</h4>
                            <div class="uk-margin">
                                <label class="kp-label" for="aws-access-key">Access Key ID</label>
                                <input class="uk-input kp-input kp-mono" id="aws-access-key" name="aws_access_key" type="text"
                                    placeholder="${n.aws_access_key?"saved \u2014 enter a new ID to change":"AKIAIOSFODNN7EXAMPLE"}">
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="aws-secret-key">Secret Access Key</label>
                                <input class="uk-input kp-input kp-mono" id="aws-secret-key" name="aws_secret_key" type="password"
                                    placeholder="${n.aws_secret_key?"saved \u2014 enter new value to change":"enter secret key"}"
                                    value="">
                                <p class="kp-muted uk-text-small uk-margin-small-top">Leave blank to keep the existing key.</p>
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="aws-region">AWS Region</label>
                                <input class="uk-input kp-input kp-mono" id="aws-region" name="aws_region" type="text"
                                    placeholder="us-east-1" value="${n.aws_region??""}">
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="aws-sns-sender-id">Sender ID <span class="kp-muted">(optional)</span></label>
                                <input class="uk-input kp-input kp-mono" id="aws-sns-sender-id" name="aws_sns_sender_id" type="text"
                                    placeholder="PodNest" value="${n.aws_sns_sender_id??""}">
                                <p class="kp-muted uk-text-small uk-margin-small-top">
                                    Alphanumeric sender name shown on the recipient's phone. Supported in select AWS regions only.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </li>

        <!-- malware: scan history retention + scanner resource caps -->
        <li>
            <div class="kp-card uk-padding">
                <div class="uk-flex uk-flex-right uk-margin-bottom">
                    ${Ge("malware")}
                </div>
                <form id="malware-form" class="uk-form-stacked">
                    <p class="kp-muted uk-text-small uk-margin-bottom">
                        Every site's html directory is scanned nightly at midnight with ClamAV and Linux Malware Detect.
                        Scans run one site at a time in a throwaway container.
                    </p>
                    <div class="uk-grid-small uk-child-width-1-3@m" uk-grid>
                        <div>
                            <label class="kp-label" for="malware-retain-days">Retain History (days)</label>
                            <input class="uk-input kp-input" id="malware-retain-days" name="malware_retain_days" type="number"
                                min="1" max="3650" step="1" placeholder="30"
                                value="${o.malware_retain_days||"30"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                Scan results older than this are pruned after each nightly run.
                            </p>
                        </div>
                        <div>
                            <label class="kp-label" for="malware-memory-mb">Scanner Memory (MB)</label>
                            <input class="uk-input kp-input" id="malware-memory-mb" name="malware_memory_mb" type="number"
                                min="512" max="65536" step="1" placeholder="2048"
                                value="${o.malware_memory_mb||"2048"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                ClamAV's signature set alone needs over 1 GB; too low and scans fail out of memory.
                            </p>
                        </div>
                        <div>
                            <label class="kp-label" for="malware-cpus">Scanner CPUs</label>
                            <input class="uk-input kp-input" id="malware-cpus" name="malware_cpus" type="number"
                                min="0.1" max="64" step="0.1" placeholder="1"
                                value="${o.malware_cpus||"1"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                CPU cores the scanner may use. Fractions are allowed (e.g. 0.5).
                            </p>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </li>
    </ul>
    `;let r=e.querySelector("#kp-settings-pills"),l=e.querySelector("#kp-settings-switcher"),c=u=>{UIkit.switcher(l).show(u),r.querySelectorAll(":scope > li").forEach((p,m)=>p.classList.toggle("kp-pill-active",m===u)),history.replaceState(null,"",u===0?"#settings":`#settings/${Ds[u]}`)};r.querySelectorAll(":scope > li > a").forEach(u=>{u.addEventListener("click",p=>{p.preventDefault(),c(parseInt(u.closest("li").dataset.pill,10))})}),c(Math.max(0,Ds.indexOf(t.tab))),s.admin_domain&&Rs(s.admin_domain),e.querySelectorAll(".kp-settings-export").forEach(u=>{u.addEventListener("click",async()=>{let p=u.dataset.group;try{await ke(`/api/settings/export?group=${encodeURIComponent(p)}`,`podnest-settings-${p}.pnm`)}catch(m){d.error(m.message)}})}),e.querySelectorAll(".kp-settings-import").forEach(u=>{u.addEventListener("change",async p=>{let m=p.target.files[0];if(!m)return;let b=p.target.dataset.group;try{if(!await be(`/api/settings/import?group=${encodeURIComponent(b)}`,m))return;d.success("Settings imported"),await St(e,{tab:b})}catch(h){d.error(h.message)}finally{p.target.value=""}})}),document.getElementById("settings-form").addEventListener("submit",async u=>{u.preventDefault();let p=u.target.querySelector('[type="submit"]'),m=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(u.target),h={admin_domain:b.get("admin_domain").trim()},g={resource_ram_reserve_gb:b.get("resource_ram_reserve_gb").trim(),resource_poll_interval:b.get("resource_poll_interval").trim(),resource_throttle_pct:b.get("resource_throttle_pct").trim(),shutdown_job_timeout:b.get("shutdown_job_timeout").trim()},v=b.get("resource_webhook_url").trim();b.has("clear_webhook")?g.resource_webhook_url="":v&&(g.resource_webhook_url=v);try{await k.put("/settings",h),await k.put("/settings/resources",g),d.success("Settings saved"),Rs(h.admin_domain)}catch(x){d.error(x.message)}finally{p.disabled=!1,p.innerHTML=m}}),document.getElementById("backup-form").addEventListener("submit",async u=>{u.preventDefault();let p=u.target.querySelector('[type="submit"]'),m=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(u.target),h={backup_schedule:b.get("backup_schedule").trim(),backup_retain_days:b.get("backup_retain_days").trim(),s3_endpoint:b.get("s3_endpoint").trim(),s3_bucket:b.get("s3_bucket").trim(),s3_region:b.get("s3_region").trim()},g=b.get("s3_access_key").trim();g&&(h.s3_access_key=g);let v=b.get("s3_secret_key").trim();v&&(h.s3_secret_key=v);try{await k.put("/settings/backup",h),d.success("Backup settings saved")}catch(x){d.error(x.message)}finally{p.disabled=!1,p.innerHTML=m}}),document.getElementById("notifications-form").addEventListener("submit",async u=>{u.preventDefault();let p=u.target.querySelector('[type="submit"]'),m=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(u.target),h={smtp_host:b.get("smtp_host").trim(),smtp_port:b.get("smtp_port").trim(),smtp_username:b.get("smtp_username").trim(),smtp_from:b.get("smtp_from").trim(),smtp_tls:b.get("smtp_tls")?"true":"false",aws_region:b.get("aws_region").trim(),aws_sns_sender_id:b.get("aws_sns_sender_id").trim()},g=b.get("smtp_password").trim();g&&(h.smtp_password=g);let v=b.get("aws_access_key").trim();v&&(h.aws_access_key=v);let x=b.get("aws_secret_key").trim();x&&(h.aws_secret_key=x);try{await k.put("/settings/notifications",h),d.success("Notification settings saved")}catch(y){d.error(y.message)}finally{p.disabled=!1,p.innerHTML=m}}),document.getElementById("malware-form").addEventListener("submit",async u=>{u.preventDefault();let p=u.target.querySelector('[type="submit"]'),m=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(u.target),h={malware_retain_days:b.get("malware_retain_days").trim(),malware_memory_mb:b.get("malware_memory_mb").trim(),malware_cpus:b.get("malware_cpus").trim()};try{await k.put("/settings/malware",h),d.success("Malware settings saved")}catch(g){d.error(g.message)}finally{p.disabled=!1,p.innerHTML=m}})}async function Hs(e){let t=`
        <div id="kp-edit-site-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit Site \u2014 ${e.Name}</h3>
                <form id="edit-site-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Name</label>
                            <input class="uk-input kp-input" name="name" type="text" value="${e.Name}" readonly disabled>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Type</label>
                            <select class="uk-select kp-select" name="site_type" id="es-site-type">
                                <option value="1" ${e.SiteType===1?"selected":""}>PHP</option>
                                <option value="3" ${e.SiteType===3?"selected":""}>Static HTML</option>
                                <option value="4" ${e.SiteType===4?"selected":""}>Node.js</option>
                                <option value="5" ${e.SiteType===5?"selected":""}>.NET</option>
                                <option value="7" ${e.SiteType===7?"selected":""}>Python</option>
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
                        <div class="uk-width-1-2@s uk-hidden" id="es-python-version-wrap">
                            <label class="kp-label">Python Version</label>
                            <select class="uk-select kp-select" name="python_version">
                                <option value="1" ${e.SiteType===7&&e.RuntimeVersion===1?"selected":""}>Python 3.11</option>
                                <option value="2" ${e.SiteType===7&&e.RuntimeVersion===2?"selected":""}>Python 3.12</option>
                                <option value="3" ${e.SiteType===7&&e.RuntimeVersion===3?"selected":""}>Python 3.13</option>
                                <option value="4" ${e.SiteType!==7||e.RuntimeVersion===4?"selected":""}>Python 3.14</option>
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
        </div>`;document.body.insertAdjacentHTML("beforeend",t);let s=UIkit.modal("#kp-edit-site-modal"),a=document.getElementById("es-site-type"),n=document.getElementById("es-php-version-wrap"),i=document.getElementById("es-node-version-wrap"),o=document.getElementById("es-dotnet-version-wrap"),r=document.getElementById("es-python-version-wrap"),l=document.getElementById("es-start-command-wrap"),c=document.getElementById("es-wordpress-wrap");s.show();let u=p=>{n.classList.toggle("uk-hidden",p!==1&&p!==2||p===6),i.classList.toggle("uk-hidden",p!==4),o.classList.toggle("uk-hidden",p!==5),r.classList.toggle("uk-hidden",p!==7),l.classList.toggle("uk-hidden",p!==4&&p!==5&&p!==7),l.querySelector("input").required=p===7,c.classList.toggle("uk-hidden",p!==1)};u(e.SiteType),a.addEventListener("change",()=>u(parseInt(a.value))),document.getElementById("edit-site-form").addEventListener("submit",async p=>{p.preventDefault();let m=p.target.querySelector('[type="submit"]'),b=m.innerHTML;m.disabled=!0,m.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let h=new FormData(p.target),g=parseInt(h.get("site_type")),v=null;g===4&&(v=parseInt(h.get("node_version"))),g===5&&(v=parseInt(h.get("dotnet_version"))),g===7&&(v=parseInt(h.get("python_version")));let x={php_version:parseInt(h.get("php_version"))||3,site_type:g,runtime_version:v,start_command:h.get("start_command")?.trim()||""},y=g===1?h.get("install_wordpress")==="on":!1;try{if(await k.put(`/sites/${e.ID}`,x),s.hide(),document.getElementById("kp-edit-site-modal")?.remove(),g!==6){_("Applying Changes","Saving changes and recreating pod...");try{await k.post(`/sites/${e.ID}/recreate`,{install_wordpress:y,prune:!0}),E(),d.success("Site updated and pod recreated")}catch(L){E(),d.error("Site saved but pod recreate failed: "+L.message)}}else d.success("Site updated");S.go("site-detail",{id:String(e.ID)})}catch(L){d.error(L.message),m.disabled=!1,m.innerHTML=b}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}function Us(e){return`
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
                    <div class="uk-flex" style="gap:6px">
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="backup-run-btn" uk-tooltip="Run a Manual Backup">
                            <span uk-icon="cloud-upload"></span>
                        </button>
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="backup-import-btn"
                            uk-toggle="target: #import-backup-modal" uk-tooltip="Import a backup archive">
                            <span uk-icon="upload"></span>
                        </button>
                    </div>
                </div>
                <div id="backup-error-banner"></div>
                <div id="backup-list-wrap">
                    <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
                </div>
            </div>

            <!-- import modal -->
            <div id="import-backup-modal" uk-modal>
                <div class="uk-modal-dialog uk-modal-body">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-small-bottom">Import Backup Archive</h3>

                    <!-- target site selector -->
                    <div class="uk-margin-small">
                        <label class="uk-form-label kp-text">Restore To</label>
                        <select class="uk-select kp-input" id="import-target-site"></select>
                    </div>

                    <hr class="uk-divider-small">

                    <!-- upload section -->
                    <h4 class="kp-text uk-margin-small-bottom">Upload Archive</h4>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Maximum upload size is <strong>512 MB</strong>. For larger archives, transfer
                        the file to <span class="kp-mono">backups/import/</span> via SFTP and use
                        the <em>Import from SFTP</em> section below.
                    </p>
                    <div class="uk-margin-small">
                        <input type="file" class="uk-input kp-input" id="import-file-input"
                            accept=".tar.gz,.tar.xz,.zip">
                    </div>
                    <button class="uk-button kp-btn-primary kp-btn-sm uk-margin-small-top" id="import-upload-btn">
                        Upload &amp; Restore
                    </button>

                    <hr class="uk-divider-small uk-margin-small">

                    <!-- SFTP section -->
                    <h4 class="kp-text uk-margin-small-bottom">Import from SFTP</h4>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Files found in <span class="kp-mono">backups/import/</span> on this site's SFTP.
                    </p>
                    <div id="import-sftp-list">
                        <div uk-spinner="ratio: 0.6" style="color:var(--kp-blue)"></div>
                    </div>
                </div>
            </div>

        </div>`}function bi(e){if(!e||e.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>';let t=a=>a===2?'<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>':'<span class="kp-mono" style="color:var(--kp-blue)">Local</span>';return`
        <div class="uk-overflow-auto">
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
            <td class="kp-mono" style="font-size:0.8rem">${f(a.SnapshotID)}</td>
            <td>${a.Label?f(a.Label):"\u2014"}</td>
            <td>${t(a.BackupType)}</td>
            <td>${R(a.SizeBytes)}</td>
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
        </table>
        </div>`}function Ns(e,t,s){let a=Date.now()+18e5,n=setInterval(async()=>{try{let i=await k.get(`/sites/${s||t}/backups/restore-status`);(!i?.active||Date.now()>a)&&(clearInterval(n),E(),i?.active?d.error("Import timed out \u2014 check server logs"):i?.error?d.error(`Import failed: ${i.error}`):d.success("Import complete"),await he(e,t))}catch{Date.now()>a&&(clearInterval(n),E(),d.error("Import status unavailable \u2014 check server logs"))}},3e3)}async function he(e,t){try{let[s,a]=await Promise.all([k.get(`/sites/${t}/backup-repo`),k.get(`/sites/${t}/backups`)]),n=e.querySelector("#backup-local-enabled"),i=e.querySelector("#backup-s3-enabled");n&&(n.checked=!!s.LocalEnabled),i&&(i.checked=!!s.S3Enabled);let o=e.querySelector("#backup-error-banner");if(o)if(s.last_error){let l=s.last_error_at?` (${new Date(s.last_error_at).toLocaleString()})`:"";o.innerHTML=`
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${l}:</strong> ${f(s.last_error)}</p>
                    </div>`}else o.innerHTML="";let r=e.querySelector("#backup-list-wrap");r&&(r.innerHTML=bi(a))}catch(s){let a=e.querySelector("#backup-list-wrap");a&&(a.innerHTML=`<p class="kp-muted uk-text-small">Failed to load backups: ${f(s.message)}</p>`)}}function Fs(e,t){e.querySelector("#backup-repo-save")?.addEventListener("click",async()=>{let a={local_enabled:e.querySelector("#backup-local-enabled")?.checked??!1,s3_enabled:e.querySelector("#backup-s3-enabled")?.checked??!1};try{await k.put(`/sites/${t}/backup-repo`,a),d.success("Backup destinations saved")}catch(n){d.error(n.message)}}),e.querySelector("#backup-run-btn")?.addEventListener("click",async()=>{try{await k.post(`/sites/${t}/backups`,{label:"manual"})}catch(i){d.error(i.message);return}_("Backup Running","Snapshotting files and database \u2014 this may take a few minutes.");let a=Date.now()+1800*1e3,n=setInterval(async()=>{try{let i=await k.get(`/sites/${t}/backups/backup-status`);(!i?.active||Date.now()>a)&&(clearInterval(n),E(),await he(e,t),i?.active?d.error("Backup is taking longer than expected \u2014 check server logs for status"):i?.error?d.error(`Backup failed: ${i.error}`):d.success("Backup complete"))}catch{}},4e3)}),e.querySelector("#backup-list-wrap")?.addEventListener("click",async a=>{let n=a.target.closest(".backup-restore-btn");if(n){let r=n.dataset.id;if(!await P("Restore Site","This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"))return;try{await k.post(`/sites/${t}/backups/${r}/restore`)}catch(m){d.error(m.message);return}_("Restore Running","Restoring files and database \u2014 the site will return automatically when complete.");let c=Date.now(),u=Date.now()+900*1e3,p=setInterval(async()=>{try{let m=await k.get(`/sites/${t}/backups/restore-status`);(!m?.active||Date.now()>u)&&(clearInterval(p),E(),m?.active?d.error("Restore timed out"):d.success("Restore complete"),await he(e,t))}catch{}},3e3);return}let i=a.target.closest(".backup-delete-btn");if(i){let r=i.dataset.id;if(!await P("Delete Snapshot","This will permanently remove the snapshot from all configured repositories. This cannot be undone."))return;_("Deleting Snapshot","Removing snapshot data from repositories \u2014 this may take a moment.");try{await k.delete(`/sites/${t}/backups/${r}`),E(),d.success("Snapshot deleted"),await he(e,t)}catch(c){E(),d.error(c.message)}}let o=a.target.closest(".backup-download-btn");if(o){let r=o.dataset.id,l=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}`,c=`kp_dl_${l}`;_("Preparing Download","Your backup archive is being generated \u2014 this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."),setTimeout(()=>{let u=document.createElement("a");u.href=`/api/sites/${t}/backups/${r}/download?dl=${l}`,u.style.display="none",document.body.appendChild(u),u.click(),document.body.removeChild(u);let p=Date.now(),m=setInterval(()=>{!document.cookie.split(";").some(h=>h.trim().startsWith(`${c}=`))&&Date.now()-p<18e5||(clearInterval(m),document.cookie=`${c}=; Path=/; Max-Age=0`,E())},500)},300);return}});let s=e.querySelector("#import-backup-modal");s&&(UIkit.util.on(s,"beforeshow",async()=>{let a=s.querySelector("#import-target-site");try{let i=await k.get("/sites"),o=Number(t);a.innerHTML=i.map(r=>`<option value="${r.ID}"${Number(r.ID)===o?" selected":""}>${r.Name}</option>`).join("")}catch{a.innerHTML='<option value="">Failed to load sites</option>'}let n=s.querySelector("#import-sftp-list");try{let i=await k.get(`/sites/${t}/backups/import/files`);!i||i.length===0?n.innerHTML='<p class="kp-muted uk-text-small">No files found.</p>':n.innerHTML=i.map(o=>`
                    <div class="uk-flex uk-flex-middle uk-flex-between uk-margin-small-bottom">
                        <span class="kp-mono uk-text-small">${f(o)}</span>
                        <button class="uk-button kp-btn-primary kp-btn-sm import-sftp-btn" data-file="${f(o)}">
                            Restore
                        </button>
                    </div>`).join("")}catch(i){n.innerHTML=`<p class="kp-muted uk-text-small">Failed to list files: ${f(i.message)}</p>`}}),s.querySelector("#import-upload-btn")?.addEventListener("click",async()=>{let a=s.querySelector("#import-file-input"),n=s.querySelector("#import-target-site")?.value;if(!a?.files?.length){d.error("Select an archive file first");return}let i=a.files[0],o=new FormData;o.append("archive",i),o.append("target_site_id",n),UIkit.modal(s).hide(),_("Importing Backup","Uploading and restoring \u2014 this may take several minutes.");try{await fetch(`/api/sites/${t}/backups/import/upload`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:o,credentials:"same-origin"}).then(async r=>{if(!r.ok){let l=await r.json().catch(()=>({}));throw new Error(l.error||`HTTP ${r.status}`)}})}catch(r){E(),d.error(r.message);return}Ns(e,t,n)}),s.querySelector("#import-sftp-list")?.addEventListener("click",async a=>{let n=a.target.closest(".import-sftp-btn");if(!n)return;let i=n.dataset.file,o=s.querySelector("#import-target-site")?.value;UIkit.modal(s).hide(),_("Importing from SFTP","Restoring archive \u2014 this may take several minutes.");try{await k.post(`/sites/${t}/backups/import/sftp`,{filename:i,target_site_id:parseInt(o,10)})}catch(r){E(),d.error(r.message);return}Ns(e,t,o)}))}function $t(){return`
        <div class="kp-card uk-padding uk-margin-top" id="basicauth-panel">
            <h3 class="kp-view-title uk-margin-bottom">Basic Auth</h3>
            <p class="kp-muted uk-text-small uk-margin-small-bottom">
                Enforced at the proxy level \u2014 no nginx involvement. All requests to this
                site will require valid credentials before any content is served.
            </p>

            <div class="uk-grid-small uk-margin-bottom" uk-grid>
                <div class="uk-width-1-2@s">
                    <label class="kp-label">
                        <input class="uk-checkbox" type="checkbox" id="ba-enabled">
                        &nbsp;Enable Basic Auth
                    </label>
                </div>
                <div class="uk-width-1-2@s">
                    <label class="kp-label" for="ba-realm">Realm</label>
                    <input class="uk-input kp-input" type="text" id="ba-realm" placeholder="Restricted">
                </div>
            </div>

            <div class="uk-flex uk-flex-right uk-margin-bottom">
                <button class="uk-button kp-btn-primary kp-btn-sm" id="ba-config-save">
                    <span uk-icon="check"></span> Save Settings
                </button>
            </div>

            <hr class="kp-divider">

            <h4 class="kp-label uk-margin-small-bottom">Credentials</h4>
            <div id="ba-users-list" class="uk-margin-small-bottom"></div>

            <div class="uk-grid-small uk-margin-small-top" uk-grid>
                <div class="uk-width-1-3@s">
                    <input class="uk-input kp-input" type="text" id="ba-new-username" placeholder="Username">
                </div>
                <div class="uk-width-1-3@s">
                    <input class="uk-input kp-input" type="password" id="ba-new-password" placeholder="Password">
                </div>
                <div class="uk-width-1-3@s">
                    <button class="uk-button kp-btn-ghost" id="ba-add-user">
                        <span uk-icon="plus"></span> Add / Update
                    </button>
                </div>
            </div>
        </div>`}async function Ce(e){let t=document.getElementById("basicauth-panel");if(t)try{let[s,a]=await Promise.all([k.get(`/sites/${e}/basicauth`),k.get(`/sites/${e}/basicauth/users`)]),n=t.querySelector("#ba-enabled"),i=t.querySelector("#ba-realm");n&&(n.checked=!!s.Enabled),i&&(i.value=s.Realm??"Restricted"),hi(t,a??[])}catch(s){d.error("Failed to load basic auth settings: "+s.message)}}function hi(e,t){let s=e.querySelector("#ba-users-list");if(s){if(!t.length){s.innerHTML='<p class="kp-muted uk-text-small">No credentials configured.</p>';return}s.innerHTML=t.map(a=>`
        <div class="uk-flex uk-flex-middle uk-margin-small-bottom ba-user-row" data-uid="${a.id}" style="gap:8px">
            <span class="kp-mono" style="flex:1">${f(a.username)}</span>
            <a href="javascript:void(0);" class="kp-muted ba-delete-btn" uk-icon="trash" uk-tooltip="Remove credential"></a>
        </div>`).join("")}}function Et(e,t){let s=new AbortController,a={signal:s.signal};e.addEventListener("click",async n=>{if(!n.target.closest("#ba-config-save"))return;let i=e.querySelector("#ba-config-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put(`/sites/${t}/basicauth`,{enabled:e.querySelector("#ba-enabled").checked,realm:e.querySelector("#ba-realm").value.trim()||"Restricted"}),d.success("Basic auth settings saved")}catch(r){d.error(r.message)}finally{i.disabled=!1,i.innerHTML=o}},a),e.addEventListener("click",async n=>{if(!n.target.closest("#ba-add-user"))return;let i=e.querySelector("#ba-new-username").value.trim(),o=e.querySelector("#ba-new-password").value;if(!i||!o){d.error("Username and password are required");return}let r=e.querySelector("#ba-add-user"),l=r.innerHTML;r.disabled=!0,r.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put(`/sites/${t}/basicauth/users`,{username:i,password:o}),d.success(`Credential saved for ${i}`),e.querySelector("#ba-new-username").value="",e.querySelector("#ba-new-password").value="",await Ce(t)}catch(c){d.error(c.message)}finally{r.disabled=!1,r.innerHTML=l}},a),e.addEventListener("click",async n=>{let i=n.target.closest(".ba-delete-btn");if(!i)return;let o=i.closest(".ba-user-row")?.dataset.uid;if(o)try{await k.delete(`/sites/${t}/basicauth/users/${o}`),d.success("Credential removed"),await Ce(t)}catch(r){d.error(r.message)}},a),e.__basicAuthAbort?.abort(),e.__basicAuthAbort=s}var Pe={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis",5:"Varnish",6:"Proxy Cache"};function _e(e,t,s){let a=s?Object.entries(s):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">${Pe[t]}</h4>
                </div>
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
                    <button type="button" class="uk-button kp-btn-ghost kp-btn-sm cfg-export" data-site="${e}" data-type="${t}" uk-tooltip="Export encrypted configuration">
                        <span uk-icon="download"></span>
                    </button>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="${t}" data-site="${e}" uk-tooltip="Import encrypted configuration" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".pnm" style="display:none" data-type="${t}" data-site="${e}">
                    </label>
                </div>
            </div>
            <div class="kp-config-grid cfg-rows" data-type="${t}">
                ${a.map(([n,i])=>fe(n,i)).join("")}
            </div>
        </div>`}function js(e,t){let s=t?.enabled==="true",a=t?Object.entries(t).filter(([n])=>n!=="enabled"):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">Varnish</h4>
                </div>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="5" uk-tooltip="Add a Key">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="5" data-site="${e}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="5" data-site="${e}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <button type="button" class="uk-button kp-btn-ghost kp-btn-sm cfg-export" data-site="${e}" data-type="5" uk-tooltip="Export encrypted configuration">
                        <span uk-icon="download"></span>
                    </button>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="5" data-site="${e}" uk-tooltip="Import encrypted configuration" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".pnm" style="display:none" data-type="5" data-site="${e}">
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
                ${a.map(([n,i])=>fe(n,i)).join("")}
            </div>
        </div>`}function Tt(e,t){let s=t?.enabled==="true",a=t?Object.entries(t).filter(([n])=>n!=="enabled"):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">Proxy Cache</h4>
                </div>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="6" uk-tooltip="Add a Key">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="6" data-site="${e}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="6" data-site="${e}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <button type="button" class="uk-button kp-btn-ghost kp-btn-sm cfg-export" data-site="${e}" data-type="6" uk-tooltip="Export encrypted configuration">
                        <span uk-icon="download"></span>
                    </button>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="6" data-site="${e}" uk-tooltip="Import encrypted configuration" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".pnm" style="display:none" data-type="6" data-site="${e}">
                    </label>
                </div>
            </div>

            <!-- enable/disable toggle \u2014 applies immediately, no pod recreate -->
            <div class="uk-margin-small-bottom" style="background:var(--kp-surface-2);padding:10px 12px;border-radius:6px">
                <label class="uk-flex uk-flex-middle" style="gap:10px;cursor:pointer">
                    <input type="checkbox" class="uk-checkbox proxycache-enabled-toggle" ${s?"checked":""}>
                    <span>Enable Proxy Cache</span>
                    <span class="kp-muted uk-text-small">\u2014 ttl_mode is fixed or upstream; memory is capped at 256M</span>
                </label>
            </div>

            <div class="kp-config-grid cfg-rows" data-type="6">
                ${a.map(([n,i])=>fe(n,i)).join("")}
            </div>
        </div>`}var Lt={5:".varnish-enabled-toggle",6:".proxycache-enabled-toggle"};function Ws(e,t,s){e.querySelector(Lt[t]).checked=s.enabled==="true",e.querySelectorAll(`.cfg-rows[data-type="${t}"] .cfg-key`).forEach(a=>{a.value==="enabled"&&a.closest(".kp-config-row").remove()})}function fe(e="",t=""){return`<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${e}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${t}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function Ct(e,t,s){e.addEventListener("click",a=>{if(a.target.closest(".cfg-add-row")){let n=a.target.closest(".cfg-add-row");e.querySelector(`.cfg-rows[data-type="${n.dataset.type}"]`).insertAdjacentHTML("beforeend",fe())}},{signal:s}),e.addEventListener("click",a=>{a.target.closest(".cfg-del-row")&&a.target.closest(".kp-config-row").remove()},{signal:s}),e.addEventListener("click",async a=>{let n=a.target.closest(".cfg-save");if(!n)return;let{type:i,site:o}=n.dataset,r=e.querySelectorAll(`.cfg-rows[data-type="${i}"] .kp-config-row`),l={};if(r.forEach(c=>{let u=c.querySelector(".cfg-key").value.trim(),p=c.querySelector(".cfg-val").value.trim();u&&(l[u]=p)}),i==="5"){let c=e.querySelector(".varnish-enabled-toggle");l.enabled=c?.checked?"true":"false"}if(i==="6"){let c=e.querySelector(".proxycache-enabled-toggle");l.enabled=c?.checked?"true":"false"}try{await k.put(`/sites/${o}/configs/${i}`,l),d.success(`${Pe[i]} config saved`)}catch(c){d.error(c.message)}},{signal:s}),e.addEventListener("click",async a=>{let n=a.target.closest(".cfg-reset");if(!n)return;let{type:i,site:o}=n.dataset;if(await P("Reset Config",`Reset ${Pe[i]} config to defaults?`))try{let l=await k.post(`/sites/${o}/configs/${i}/reset`),c=e.querySelector(`.cfg-rows[data-type="${i}"]`);c.innerHTML=Object.entries(l).map(([u,p])=>fe(u,p)).join(""),Lt[i]&&Ws(e,i,l),d.success(`${Pe[i]} reset to defaults`)}catch(l){d.error(l.message)}},{signal:s}),e.addEventListener("click",async a=>{let n=a.target.closest(".cfg-export");if(!n)return;let{site:i,type:o}=n.dataset;try{await ke(`/api/sites/${i}/configs/${o}/export`,`${i}-config-${o}.pnm`)}catch(r){d.error(r.message)}},{signal:s}),e.addEventListener("change",async a=>{let n=a.target.closest(".cfg-import-input");if(!n)return;let{type:i,site:o}=n.dataset,r=n.files[0];if(r)try{let l=await be(`/api/sites/${o}/configs/${i}/import`,r);if(!l)return;let c=e.querySelector(`.cfg-rows[data-type="${i}"]`);c.innerHTML=Object.entries(l).map(([u,p])=>fe(u,p)).join(""),Lt[i]&&Ws(e,i,l),d.success(`${Pe[i]} config imported`)}catch(l){d.error(l.message)}finally{n.value=""}},{signal:s})}function zs(e){return`
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

        </div>`}function Vs(e){if(!e||e.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No cron jobs configured.</p>';let t=a=>a?new Date(a).toLocaleString():"\u2014";return`
        <div class="uk-overflow-auto">
        <table class="uk-table uk-table-divider uk-table-small uk-table-middle kp-fm-table">
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
            <tbody>${e.map(a=>`
        <tr>
            <td class="kp-text">${a.Label||'<span class="kp-muted">\u2014</span>'}</td>
            <td class="kp-mono kp-text-sm">${a.Schedule}</td>
            <td class="kp-muted uk-text-small">${t(a.LastRun)}</td>
            <td>
                ${a.LastError?'<span class="kp-badge kp-badge-error">Error</span>':a.LastRun?'<span class="kp-badge kp-badge-success">OK</span>':'<span class="kp-muted uk-text-small">\u2014</span>'}
                ${a.LastOutput||a.LastError?`<a class="kp-cron-detail-btn cron-detail-btn" data-id="${a.ID}" uk-tooltip="View Run Details">
                            <span uk-icon="icon: info; ratio: 0.75"></span>
                        </a>`:""}
            </td>
            <td>
                <input type="checkbox" class="uk-checkbox cron-toggle"
                    data-id="${a.ID}" ${a.Enabled?"checked":""}>
            </td>
            <td>
                <div class="uk-flex kp-cron-actions">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cron-run-btn"
                        data-id="${a.ID}" uk-tooltip="Run Now">
                        <span uk-icon="play"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cron-edit-btn"
                        data-id="${a.ID}" uk-tooltip="Edit">
                        <span uk-icon="pencil"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm cron-delete-btn"
                        data-id="${a.ID}" uk-tooltip="Delete">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("")}</tbody>
        </table>
        </div>`}async function Ye(e,t){let s=e.querySelector("#cron-list-wrap");if(s)try{let a=await k.get(`/sites/${t}/crons`);s.innerHTML=Vs(a)}catch(a){s.innerHTML=`<p class="kp-muted uk-text-small">Failed to load cron jobs: ${f(a.message)}</p>`}}function Ks(e,t){let s=[],a=e.querySelector("#cron-modal"),n=e.querySelector("#cron-modal-title"),i=e.querySelector("#cron-modal-id"),o=e.querySelector("#cron-modal-label"),r=e.querySelector("#cron-modal-command"),l=e.querySelector("#cron-modal-schedule"),c=e.querySelector("#cron-schedule-preview"),u=e.querySelector("#cron-modal-enabled");l?.addEventListener("input",()=>{c.textContent=Os(l.value.trim())}),e.querySelector("#cron-add-btn")?.addEventListener("click",()=>{n.textContent="Add Cron Job",i.value="",o.value="",r.value="",l.value="",c.textContent="",u.checked=!0,UIkit.modal(a).show()}),e.querySelector("#cron-modal-save")?.addEventListener("click",async()=>{let p=r.value.trim(),m=l.value.trim();if(!p||!m){d.error("Command and schedule are required");return}let b={label:o.value.trim(),command:p,schedule:m,enabled:u.checked},h=i.value;try{h?(await k.put(`/sites/${t}/crons/${h}`,b),d.success("Cron job updated")):(await k.post(`/sites/${t}/crons`,b),d.success("Cron job created")),UIkit.modal(a).hide(),await Ye(e,t),s=await k.get(`/sites/${t}/crons`)}catch(g){d.error(g.message)}}),e.querySelector("#cron-list-wrap")?.addEventListener("click",async p=>{let m=p.target.closest(".cron-detail-btn");if(m){let v=m.dataset.id,x=s.find(L=>String(L.ID)===v);if(!x)return;document.body.insertAdjacentHTML("beforeend",`
                <div id="cron-detail-modal" uk-modal>
                    <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                        <button class="uk-modal-close-default" type="button" uk-close></button>
                        <h3 class="kp-view-title uk-margin-bottom">Run Details \u2014 ${f(x.Label||String(x.ID))}</h3>
                        <div class="uk-margin-small-bottom">
                            <label class="kp-label">Output</label>
                            <pre class="kp-cron-output">${f(x.LastOutput||"(no output)")}</pre>
                        </div>
                        <div class="uk-margin-small-top">
                            <label class="kp-label">Error</label>
                            <pre class="kp-cron-output kp-cron-output-error">${f(x.LastError||"(no error)")}</pre>
                        </div>
                    </div>
                </div>`);let y=document.getElementById("cron-detail-modal");UIkit.modal(y).show(),y.addEventListener("hidden",()=>y.remove(),{once:!0});return}let b=p.target.closest(".cron-edit-btn");if(b){let v=b.dataset.id,x=s.find(y=>String(y.ID)===v);if(!x)return;n.textContent="Edit Cron Job",i.value=x.ID,o.value=x.Label||"",r.value=x.Command,l.value=x.Schedule,c.textContent=Os(x.Schedule),u.checked=x.Enabled,UIkit.modal(a).show();return}let h=p.target.closest(".cron-delete-btn");if(h){let v=h.dataset.id;if(!await P("Delete Cron Job","This will permanently remove the cron job. Continue?"))return;try{await k.delete(`/sites/${t}/crons/${v}`),d.success("Cron job deleted"),await Ye(e,t),s=await k.get(`/sites/${t}/crons`)}catch(y){d.error(y.message)}return}let g=p.target.closest(".cron-run-btn");if(g){let v=g.dataset.id;try{await k.post(`/sites/${t}/crons/${v}/run`)}catch(w){d.error(w.message);return}_("Running Cron Job","Executing the job inside the container \u2014 please wait.");let x=null;try{x=(await k.get(`/sites/${t}/crons`)).find(T=>String(T.ID)===v)?.LastRun??null}catch{}let y=Date.now()+300*1e3,L=setInterval(async()=>{try{let w=await k.get(`/sites/${t}/crons`),T=w.find(C=>String(C.ID)===v);if(!T||T.LastRun!==x||Date.now()>y){clearInterval(L),E(),s=w??[];let C=e.querySelector("#cron-list-wrap");C&&(C.innerHTML=Vs(w)),T?.LastError?d.error(`Job failed: ${T.LastError}`):d.success("Cron job complete")}}catch{}},2e3);return}}),e.querySelector("#cron-list-wrap")?.addEventListener("change",async p=>{let m=p.target.closest(".cron-toggle");if(!m)return;let b=m.dataset.id;try{await k.patch(`/sites/${t}/crons/${b}/toggle`,{enabled:m.checked}),d.success(m.checked?"Cron job enabled":"Cron job disabled")}catch(h){d.error(h.message),m.checked=!m.checked}}),k.get(`/sites/${t}/crons`).then(p=>{s=p??[]}).catch(()=>{})}function Os(e){if(!e)return"";let t=e.trim().split(/\s+/);if(t.length!==5)return"invalid expression";let[s,a,n,i,o]=t;if(e==="* * * * *")return"every minute";if(s!=="*"&&a!=="*"&&n==="*"&&i==="*"&&o==="*")return`daily at ${a.padStart(2,"0")}:${s.padStart(2,"0")}`;if(s!=="*"&&a!=="*"&&n==="*"&&i==="*"&&o!=="*"){let r=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return`weekly on ${o.split(",").map(c=>r[parseInt(c)]??c).join(", ")} at ${a.padStart(2,"0")}:${s.padStart(2,"0")}`}return s.startsWith("*/")?`every ${s.slice(2)} minutes`:a.startsWith("*/")?`every ${a.slice(2)} hours`:e}function Ys(e,t){return`
        <div id="dbtools-panel" data-site-id="${e}">

            <!-- tab pills -->
            <ul class="kp-tab-pills" id="kp-db-pills">
                <li data-tab="db-export"><a href="#"><span uk-icon="icon: download; ratio: 0.85"></span> Export</a></li>
                <li data-tab="db-import"><a href="#"><span uk-icon="icon: upload; ratio: 0.85"></span> Import</a></li>
                ${t===1?'<li data-tab="db-replace"><a href="#"><span uk-icon="icon: search; ratio: 0.85"></span> Search &amp; Replace</a></li>':""}
                <li data-tab="db-tables"><a href="#"><span uk-icon="icon: table; ratio: 0.85"></span> Optimize &amp; Repair</a></li>
            </ul>

            <!-- switcher panels -->
            <ul class="uk-switcher uk-margin-large-bottom" id="kp-db-switcher">

                <!-- export -->
                <li>
                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Export</h3>
                            <button class="uk-button kp-btn-primary kp-btn-sm" id="dbtools-dump-btn" uk-tooltip="Download a Database Dump">
                                <span uk-icon="download"></span>
                            </button>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Downloads a gzip-compressed SQL dump of the site's database, including stored routines.
                        </p>
                    </div>
                </li>

                <!-- import -->
                <li>
                    <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                        <input type="checkbox" class="uk-checkbox" id="dbtools-wipe">
                        <span class="kp-text">Wipe the database before importing</span>
                    </label>
                    <p class="kp-muted uk-text-small uk-margin-small-top uk-margin-small-bottom">
                        Without wipe, the dump is merged into the existing database \u2014 tables the dump recreates are
                        replaced, everything else is kept. The site is in maintenance mode while the import runs.
                    </p>

                    <div class="kp-card uk-padding-small uk-margin-bottom">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Upload Dump</h3>
                            <button class="uk-button kp-btn-primary kp-btn-sm" id="dbtools-upload-btn" uk-tooltip="Upload &amp; Import">
                                <span uk-icon="cloud-upload"></span>
                            </button>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            Accepts <span class="kp-mono">.sql</span> or <span class="kp-mono">.sql.gz</span>. Maximum upload
                            size is <strong>512 MB</strong>. For larger dumps, transfer the file to
                            <span class="kp-mono">backups/import/</span> via SFTP and use <em>Import from SFTP</em> below.
                        </p>
                        <input type="file" class="uk-input kp-input" id="dbtools-file-input" accept=".sql,.gz">
                    </div>

                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Import from SFTP</h3>
                            <button class="uk-button kp-btn-ghost kp-btn-sm" id="dbtools-sftp-refresh" uk-tooltip="Refresh the SFTP File List">
                                <span uk-icon="refresh"></span>
                            </button>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            Dumps found in <span class="kp-mono">backups/import/</span> on this site's SFTP.
                        </p>
                        <div id="dbtools-sftp-list">
                            <div uk-spinner="ratio: 0.6" style="color:var(--kp-blue)"></div>
                        </div>
                    </div>
                </li>

                ${t===1?`
                <!-- search-replace (WordPress only) -->
                <li>
                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Search &amp; Replace</h3>
                            <div class="uk-flex" style="gap:6px">
                                <button class="uk-button kp-btn-secondary kp-btn-sm" id="dbtools-sr-preview" uk-tooltip="Count Matches Without Changing Anything">
                                    <span uk-icon="search"></span>
                                </button>
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="dbtools-sr-run" uk-tooltip="Run the Search &amp; Replace">
                                    <span uk-icon="play"></span>
                                </button>
                            </div>
                        </div>
                        <div class="uk-grid-small uk-child-width-1-2@s" uk-grid>
                            <div>
                                <label class="uk-form-label kp-text" for="dbtools-sr-search">Search</label>
                                <input class="uk-input kp-input" id="dbtools-sr-search" type="text" maxlength="1024" autocomplete="off">
                            </div>
                            <div>
                                <label class="uk-form-label kp-text" for="dbtools-sr-replace">Replace</label>
                                <input class="uk-input kp-input" id="dbtools-sr-replace" type="text" maxlength="1024" autocomplete="off">
                            </div>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Runs WP-CLI's serialization-safe search-replace across every table in the site's database.
                            Preview first to see how many replacements would be made.
                        </p>
                        <div id="dbtools-sr-result"></div>
                    </div>
                </li>`:""}

                <!-- optimize / repair -->
                <li>
                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Optimize &amp; Repair</h3>
                            <div class="uk-flex" style="gap:6px">
                                <button class="uk-button kp-btn-ghost kp-btn-sm" id="dbtools-tables-refresh" uk-tooltip="Refresh the Table List">
                                    <span uk-icon="refresh"></span>
                                </button>
                                <button class="uk-button kp-btn-primary kp-btn-sm dbtools-maintain-btn" data-action="optimize" uk-tooltip="Optimize the Selected Tables" disabled>
                                    <span uk-icon="bolt"></span>
                                </button>
                                <button class="uk-button kp-btn-secondary kp-btn-sm dbtools-maintain-btn" data-action="repair" uk-tooltip="Repair the Selected Tables" disabled>
                                    <span uk-icon="cog"></span>
                                </button>
                            </div>
                        </div>
                        <div id="dbtools-tables-wrap">
                            <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
                        </div>
                        <div id="dbtools-maintain-result"></div>
                    </div>
                </li>
            </ul>
        </div>`}function Qs(e,t){let s=e.querySelector("#dbtools-panel"),a=e.querySelector("#kp-db-pills"),n=e.querySelector("#kp-db-switcher");if(!s||!a||!n)return;let i=s.dataset.siteId,o=[...a.querySelectorAll(":scope > li")],r=(l,c)=>{UIkit.switcher(n).show(l),o.forEach((u,p)=>u.classList.toggle("kp-pill-active",p===l)),c&&history.replaceState(null,"",`#site-detail/${i}/${o[l].dataset.tab}`)};o.forEach((l,c)=>{l.querySelector(":scope > a").addEventListener("click",u=>{u.preventDefault(),r(c,!0)})}),r(Math.max(0,o.findIndex(l=>l.dataset.tab===t)),!1)}function Zs(e,t){e.querySelector("#dbtools-dump-btn")?.addEventListener("click",()=>{let s=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}`,a=`kp_dl_${s}`;_("Preparing Download","Your database dump is being generated \u2014 your download will begin automatically. Do not close this tab."),setTimeout(()=>{let n=document.createElement("a");n.href=`/api/sites/${t}/db/dump?dl=${s}`,n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n);let i=Date.now(),o=setInterval(()=>{!document.cookie.split(";").some(l=>l.trim().startsWith(`${a}=`))&&Date.now()-i<18e5||(clearInterval(o),document.cookie=`${a}=; Path=/; Max-Age=0`,E())},500)},300)}),e.querySelector("#dbtools-upload-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#dbtools-file-input");if(!s?.files?.length){d.error("Select a .sql or .sql.gz file first");return}let a=await Js(e);if(a===null)return;let n=new FormData;n.append("dump",s.files[0]),n.append("wipe",a?"1":"0"),_("Importing Database","Uploading and importing \u2014 the site is in maintenance mode until this completes.");try{await fetch(`/api/sites/${t}/db/import/upload`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:n,credentials:"same-origin"}).then(async i=>{if(!i.ok){let o=await i.json().catch(()=>({}));throw new Error(o.error||`HTTP ${i.status}`)}})}catch(i){E(),d.error(i.message);return}s.value="",Xs(e,t)}),e.querySelector("#dbtools-sftp-list")?.addEventListener("click",async s=>{let a=s.target.closest(".dbtools-sftp-btn");if(!a)return;let n=await Js(e);if(n!==null){_("Importing Database","Importing from SFTP \u2014 the site is in maintenance mode until this completes.");try{await k.post(`/sites/${t}/db/import/sftp`,{filename:a.dataset.file,wipe:n})}catch(i){E(),d.error(i.message);return}Xs(e,t)}}),e.querySelector("#dbtools-sr-preview")?.addEventListener("click",()=>Gs(e,t,!0)),e.querySelector("#dbtools-sr-run")?.addEventListener("click",()=>Gs(e,t,!1)),e.querySelector("#dbtools-tables-wrap")?.addEventListener("change",s=>{s.target.id==="dbtools-tables-all"&&e.querySelectorAll(".dbtools-table-check").forEach(a=>{a.checked=s.target.checked}),It(e)}),e.querySelectorAll(".dbtools-maintain-btn").forEach(s=>{s.addEventListener("click",()=>fi(e,t,s.dataset.action))}),e.querySelector("#dbtools-tables-refresh")?.addEventListener("click",()=>_t(e,t)),_t(e,t),e.querySelector("#dbtools-sftp-refresh")?.addEventListener("click",()=>Pt(e,t)),Pt(e,t)}async function Js(e){let t=!!e.querySelector("#dbtools-wipe")?.checked;return await P(t?"Wipe & Import Database":"Import Database",t?"Every table, view and routine in this site's database will be dropped before the import. This cannot be undone.":"The dump will be merged into this site's database, replacing any tables it recreates. This cannot be undone.")?t:null}async function Pt(e,t){let s=e.querySelector("#dbtools-sftp-list");if(s)try{let a=await k.get(`/sites/${t}/db/import/files`);if(!a||a.length===0){s.innerHTML='<p class="kp-muted uk-text-small uk-margin-remove">No files found.</p>';return}s.innerHTML=a.map(n=>`
            <div class="uk-flex uk-flex-middle uk-flex-between uk-margin-small-bottom">
                <span class="kp-mono uk-text-small">${f(n)}</span>
                <button class="uk-button kp-btn-primary kp-btn-sm dbtools-sftp-btn" data-file="${f(n)}">
                    Import
                </button>
            </div>`).join("")}catch(a){s.innerHTML=`<p class="kp-muted uk-text-small">Failed to list files: ${f(a.message)}</p>`}}function Xs(e,t){let s=Date.now()+18e5,a=setInterval(async()=>{try{let n=await k.get(`/sites/${t}/db/import/status`);(!n?.active||Date.now()>s)&&(clearInterval(a),E(),n?.active?d.error("Import timed out \u2014 check server logs"):n?.error?d.error(`Import failed: ${n.error}`):d.success("Import complete"),await Pt(e,t))}catch{Date.now()>s&&(clearInterval(a),E(),d.error("Import status unavailable \u2014 check server logs"))}},3e3)}async function Gs(e,t,s){let a=e.querySelector("#dbtools-sr-search")?.value??"",n=e.querySelector("#dbtools-sr-replace")?.value??"",i=e.querySelector("#dbtools-sr-result");if(!a){d.error("Enter a search term first");return}if(!(!s&&!await P("Run Search & Replace",`Every occurrence of "${a}" in this site's database will be replaced with "${n}". This cannot be undone \u2014 download a dump first if unsure.`))){_(s?"Previewing Search & Replace":"Running Search & Replace","Scanning every table in the site's database \u2014 this may take a while on large sites.");try{let o=await k.post(`/sites/${t}/db/search-replace`,{search:a,replace:n,dry_run:s},18e5);E();let r=o?.count??0,l=s?`${r} replacement${r===1?"":"s"} would be made`:`${r} replacement${r===1?"":"s"} made`;i&&(i.innerHTML=`<p class="kp-text uk-text-small uk-margin-small-top uk-margin-remove-bottom">${f(l)}</p>`),s||d.success(l)}catch(o){E(),d.error(o.message)}}}async function _t(e,t){let s=e.querySelector("#dbtools-tables-wrap");if(s){try{let a=await k.get(`/sites/${t}/db/tables`);if(!a||a.length===0){s.innerHTML='<p class="kp-muted uk-text-small uk-margin-remove">No tables found.</p>',It(e);return}let n=a.map(i=>`
            <tr>
                <td><input class="uk-checkbox dbtools-table-check" type="checkbox" value="${f(i.name)}"></td>
                <td class="kp-mono" style="font-size:0.8rem">${f(i.name)}</td>
                <td>${f(i.engine||"\u2014")}</td>
                <td class="uk-visible@s">${Number(i.rows).toLocaleString()}</td>
                <td>${R(i.size)}</td>
            </tr>`).join("");s.innerHTML=`
            <div class="uk-overflow-auto">
            <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                <thead>
                    <tr>
                        <th class="uk-table-shrink">
                            <input class="uk-checkbox" type="checkbox" id="dbtools-tables-all" uk-tooltip="Select All">
                        </th>
                        <th>Table</th>
                        <th>Engine</th>
                        <th class="uk-visible@s">Rows</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>${n}</tbody>
            </table>
            </div>`}catch(a){s.innerHTML=`<p class="kp-muted uk-text-small">Failed to list tables: ${f(a.message)}</p>`}It(e)}}function It(e){let t=[...e.querySelectorAll(".dbtools-table-check")],s=t.filter(n=>n.checked).length,a=e.querySelector("#dbtools-tables-all");a&&(a.checked=s>0&&s===t.length,a.indeterminate=s>0&&s<t.length),e.querySelectorAll(".dbtools-maintain-btn").forEach(n=>{n.disabled=s===0})}async function fi(e,t,s){let a=[...e.querySelectorAll(".dbtools-table-check:checked")].map(r=>r.value);if(a.length===0)return;let n=s==="repair"?"Repair":"Optimize";if(!await P(`${n} Tables`,`${n} ${a.length} table${a.length===1?"":"s"}? Tables may be briefly locked while this runs.`))return;_(`${n} Running`,`Running ${s} on ${a.length} table${a.length===1?"":"s"} \u2014 this may take a while on large tables.`);let o=e.querySelector("#dbtools-maintain-result");try{let r=await k.post(`/sites/${t}/db/tables/maintain`,{action:s,tables:a},18e5);E(),o&&(o.innerHTML=`<pre class="kp-cron-output uk-margin-small-top">${f(r?.output||"(no output)")}</pre>`),d.success(`${n} complete`)}catch(r){E(),d.error(r.message)}await _t(e,t)}var j="";function na(e){return`
        <div class="kp-card uk-padding uk-margin-top" id="fm-root" data-site="${e}">
            <div class="uk-flex uk-flex-middle uk-flex-between uk-margin-bottom" style="gap:8px;flex-wrap:wrap">
                <nav id="fm-breadcrumb" class="kp-fm-breadcrumb uk-text-small"></nav>
                <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="fm-new-file" uk-tooltip="New File"><span uk-icon="file-edit"></span></button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="fm-new-dir" uk-tooltip="New Folder"><span uk-icon="folder"></span></button>
                    <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Upload">
                        <span uk-icon="upload"></span>
                        <input type="file" id="fm-upload" multiple style="display:none">
                    </label>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="fm-refresh" uk-tooltip="Refresh"><span uk-icon="refresh"></span></button>
                </div>
            </div>
            <div id="fm-list"></div>
        </div>`}function gi(){let e=j?j.split("/"):[],t="",s=['<a href="#" data-path="">html</a>'];for(let a of e)t=t?t+"/"+a:a,s.push(`<span class="kp-fm-sep">/</span><a href="#" data-path="${f(t)}">${f(a)}</a>`);return s.join("")}function vi(e){let t=new Date(e);return isNaN(t)?"":t.toLocaleString(void 0,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}function ea(e){return e==="d"?"folder":e==="l"?"link":"file-text"}function ge(e,t){return e?e+"/"+t:t}var ta=new Set(["php","js","jsx","ts","tsx","css","scss","sass","less","html","htm","xml","json","txt","md","markdown","yml","yaml","ini","conf","cnf","toml","env","sh","bash","sql","log","csv","tsv","svg","htaccess","gitignore","lock","map"]);function yi(e,t){if(t)return!1;let s=e.lastIndexOf(".");return e.startsWith(".")&&s===0?ta.has(e.slice(1).toLowerCase()):s>=0&&ta.has(e.slice(s+1).toLowerCase())}function wi(e){if(!e||!e.length)return ce("folder","This folder is empty");let t=document.getElementById("fm-root").dataset.site;return`
        <table class="uk-table uk-table-divider uk-table-small uk-table-middle kp-fm-table">
            <thead>
                <tr>
                    <th>Name</th><th>Size</th><th>Perms</th><th>Modified</th><th></th>
                </tr>
            </thead>
            <tbody>${e.map(a=>{let n=ge(j,a.name),i=a.is_dir,o=yi(a.name,i),r=i?`<a href="#" class="fm-nav" data-path="${f(n)}"><span uk-icon="icon: ${ea(a.type)}; ratio: 0.9"></span> ${f(a.name)}</a>`:`<span><span uk-icon="icon: ${ea(a.type)}; ratio: 0.9"></span> ${f(a.name)}</span>`;return`
            <tr data-path="${f(n)}" data-name="${f(a.name)}" data-dir="${i?1:0}" data-mode="${f(a.mode)}">
                <td class="kp-fm-name">${r}</td>
                <td class="uk-text-nowrap">${R(a.size,i)}</td>
                <td><code class="kp-mono">${f(a.mode)}</code></td>
                <td class="uk-text-nowrap uk-text-small kp-muted">${vi(a.mod_time)}</td>
                <td class="uk-text-right uk-text-nowrap">
                    ${o?`<button class="kp-fm-act fm-edit" data-path="${f(n)}" uk-tooltip="Edit"><span uk-icon="icon: pencil; ratio: 0.85"></span></button>`:""}
                    ${i?"":`<a class="kp-fm-act fm-download" href="/api/sites/${t}/files/download?path=${encodeURIComponent(n)}" uk-tooltip="Download"><span uk-icon="icon: download; ratio: 0.85"></span></a>`}
                    <button class="kp-fm-act fm-chmod" uk-tooltip="Permissions"><span uk-icon="icon: settings; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-rename" uk-tooltip="Rename / Move"><span uk-icon="icon: move; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-copy" uk-tooltip="Copy"><span uk-icon="icon: copy; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-delete" uk-tooltip="Delete"><span uk-icon="icon: trash; ratio: 0.85"></span></button>
                </td>
            </tr>`}).join("")}</tbody>
        </table>`}async function F(e){let t=document.getElementById("fm-list"),s=document.getElementById("fm-breadcrumb");if(t){t.innerHTML=Ue(),s&&(s.innerHTML=gi());try{let a=await k.get(`/sites/${e}/files?path=${encodeURIComponent(j)}`);t.innerHTML=wi(a)}catch(a){t.innerHTML=D("Failed to list files: "+a.message)}}}function sa(e,t){j=t||"",F(e)}function Ie(e,t,s=""){return new Promise(a=>{let n="fm-prompt-modal";document.getElementById(n)?.remove();let i=document.createElement("div");i.id=n,i.setAttribute("uk-modal",""),i.innerHTML=`
            <div class="uk-modal-dialog uk-modal-body kp-modal">
                <h3 class="uk-modal-title">${f(e)}</h3>
                <label class="kp-label uk-margin-small-bottom">${f(t)}</label>
                <input class="uk-input kp-input" id="fm-prompt-input" value="${f(s)}" autocomplete="off">
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                    <button class="uk-button kp-btn-primary" id="fm-prompt-ok">OK</button>
                </div>
            </div>`,document.body.appendChild(i),window.UIkit&&UIkit.icon(i);let o=UIkit.modal(i),r=i.querySelector("#fm-prompt-input"),l=!1,c=u=>{l||(l=!0,a(u),o.hide())};i.querySelector("#fm-prompt-ok").addEventListener("click",()=>c(r.value.trim()||null)),r.addEventListener("keydown",u=>{u.key==="Enter"&&(u.preventDefault(),c(r.value.trim()||null))}),UIkit.util.on(i,"hidden",()=>{l||(l=!0,a(null)),i.remove()}),o.show(),setTimeout(()=>r.focus(),50)})}async function xi(e,t){let s=ge(j,t.name),a=await fetch(`/api/sites/${e}/files/upload?path=${encodeURIComponent(s)}`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:t}),n=a.status===204?null:await a.json().catch(()=>null);if(!a.ok)throw new Error(n?.error||`HTTP ${a.status}`)}function ia(e,t){j="",e.addEventListener("click",s=>{let a=s.target.closest("#fm-breadcrumb a");if(a){s.preventDefault(),sa(t,a.dataset.path);return}let n=s.target.closest(".fm-nav");if(n){s.preventDefault(),sa(t,n.dataset.path);return}let i=s.target.closest(".fm-edit");if(i){s.preventDefault(),Ei(t,i.dataset.path,i.dataset.path.split("/").pop());return}}),e.querySelector("#fm-new-file")?.addEventListener("click",async()=>{let s=await Ie("New File","File name");if(s)try{await k.post(`/sites/${t}/files/file`,{path:ge(j,s)}),F(t)}catch(a){d.error(a.message)}}),e.querySelector("#fm-new-dir")?.addEventListener("click",async()=>{let s=await Ie("New Folder","Folder name");if(s)try{await k.post(`/sites/${t}/files/dir`,{path:ge(j,s)}),F(t)}catch(a){d.error(a.message)}}),e.querySelector("#fm-upload")?.addEventListener("change",async s=>{let a=[...s.target.files];if(a.length)try{for(let n of a)await xi(t,n);d.success(a.length===1?"File uploaded":`${a.length} files uploaded`),F(t)}catch(n){d.error(n.message)}finally{s.target.value=""}}),e.querySelector("#fm-refresh")?.addEventListener("click",()=>F(t)),e.addEventListener("click",async s=>{let a=s.target.closest("tr[data-path]");if(!a)return;let n=a.dataset.path,i=a.dataset.name;if(s.target.closest(".fm-chmod")){let o=await Ie("Permissions",`Octal mode for "${i}"`,a.dataset.mode);if(!o)return;try{await k.patch(`/sites/${t}/files/chmod`,{path:n,mode:o}),F(t)}catch(r){d.error(r.message)}return}if(s.target.closest(".fm-rename")){let o=await Ie("Rename / Move","New path (relative to current folder)",i);if(!o||o===i)return;try{await k.post(`/sites/${t}/files/move`,{src:n,dst:ge(j,o)}),F(t)}catch(r){d.error(r.message)}return}if(s.target.closest(".fm-copy")){let o=await Ie("Copy","Destination name",i+"-copy");if(!o)return;try{await k.post(`/sites/${t}/files/copy`,{src:n,dst:ge(j,o)}),F(t)}catch(r){d.error(r.message)}return}if(s.target.closest(".fm-delete")){if(!await P("Delete",`Delete "${i}"? This cannot be undone.`))return;try{await k.delete(`/sites/${t}/files?path=${encodeURIComponent(n)}`),F(t)}catch(r){d.error(r.message)}return}})}var Qe=null;function aa(e){if(document.querySelector(`link[href="${e}"]`))return;let t=document.createElement("link");t.rel="stylesheet",t.href=e,document.head.appendChild(t)}function Bt(e){return new Promise((t,s)=>{let a=document.querySelector(`script[src="${e}"]`);if(a){if(a.dataset.loaded)return t();a.addEventListener("load",()=>t()),a.addEventListener("error",()=>s(new Error("failed to load "+e)));return}let n=document.createElement("script");n.src=e,n.addEventListener("load",()=>{n.dataset.loaded="1",t()}),n.addEventListener("error",()=>s(new Error("failed to load "+e))),document.head.appendChild(n)})}function Si(){if(Qe)return Qe;let e="/static/vendor/codemirror";return aa(`${e}/lib/codemirror.css`),aa(`${e}/theme/material-darker.css`),Qe=Bt(`${e}/lib/codemirror.js`).then(()=>Promise.all([Bt(`${e}/mode/meta.js`),Bt(`${e}/addon/mode/loadmode.js`)])).then(()=>{window.CodeMirror.modeURL=`${e}/mode/%N/%N.js`}),Qe}function $i(e){let t=window.CodeMirror.findModeByFileName(e);return t?t.mode:null}async function Ei(e,t,s){let a;try{a=await k.get(`/sites/${e}/files/content?path=${encodeURIComponent(t)}`)}catch(m){let b=/too large/i.test(m.message)?"File is too large to edit \u2014 download it instead.":/binary/i.test(m.message)?"Binary file \u2014 download it instead of editing.":m.message;d.error(b);return}try{await Si()}catch(m){d.error("Editor failed to load: "+m.message);return}let n="fm-editor-modal";document.getElementById(n)?.remove();let i=document.createElement("div");i.id=n,i.setAttribute("uk-modal",""),i.innerHTML=`
        <div class="uk-modal-dialog kp-modal kp-fm-editor-dialog">
            <div class="uk-flex uk-flex-middle uk-flex-between uk-padding-small">
                <h3 class="uk-modal-title uk-margin-remove"><span uk-icon="file-text"></span> ${f(s)} <span id="fm-ed-dirty" class="kp-muted uk-text-small" hidden>\u2022 unsaved</span></h3>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="fm-ed-save"><span uk-icon="icon: check; ratio: 0.85"></span> Save</button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm uk-modal-close"><span uk-icon="icon: close; ratio: 0.85"></span></button>
                </div>
            </div>
            <div class="kp-fm-editor-body">
                <textarea id="fm-ed-area"></textarea>
            </div>
        </div>`,document.body.appendChild(i),window.UIkit&&UIkit.icon(i);let o=UIkit.modal(i,{bgClose:!1,escClose:!0}),r=i.querySelector("#fm-ed-dirty"),l=null,c=!0,u=m=>{c=!m,r.hidden=!m};UIkit.util.on(i,"shown",()=>{if(l)return;l=window.CodeMirror.fromTextArea(i.querySelector("#fm-ed-area"),{value:a.content,lineNumbers:!0,theme:"material-darker",indentUnit:4,lineWrapping:!1,extraKeys:{"Ctrl-S":p,"Cmd-S":p,"Ctrl-F":"findPersistent","Ctrl-/":"toggleComment"}}),l.setValue(a.content),l.on("change",()=>u(!0));let m=$i(s);m&&(l.setOption("mode",m),window.CodeMirror.autoLoadMode(l,m)),setTimeout(()=>l.refresh(),30)}),UIkit.util.on(i,"hidden",()=>i.remove());async function p(){if(!l)return;let m=i.querySelector("#fm-ed-save"),b=m.innerHTML;m.disabled=!0,m.innerHTML='<div uk-spinner="ratio: 0.6"></div>';try{await k.put(`/sites/${e}/files/content`,{path:t,content:l.getValue()}),u(!1),d.success("Saved"),F(e)}catch(h){d.error(h.message)}finally{m.disabled=!1,m.innerHTML=b}}i.querySelector("#fm-ed-save").addEventListener("click",p),UIkit.util.on(i,"beforehide",m=>{!c&&!window.confirm("Discard unsaved changes?")&&m.preventDefault()}),o.show()}var Li=2e3;function qt(e,t){return`
        <div>
            <div class="kp-log-controls">
                <select class="uk-select kp-select" id="log-container" style="width:140px;height:38px">
                    ${t===6?'<option value="access">Access Log</option><option value="waf">WAF Log</option>':`<option value="access">Access</option>
            <option value="nginx">Nginx</option>
                    ${(()=>{switch(t){case 1:case 2:return'<option value="php">PHP-FPM</option>';case 4:return'<option value="app">Node.js</option>';case 5:return'<option value="app">.NET</option>';case 7:return'<option value="app">Python</option>';default:return""}})()}
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
        </div>`}function oa(e,t){let s=null,a=!1,n=e.querySelector("#log-output"),i=e.querySelector("#log-connect"),o=e.querySelector("#log-disconnect"),r=e.querySelector("#log-clear"),l=e.querySelector("#log-autoscroll"),c=e.querySelector("#log-status");function u(b){for(b.split(`
`).forEach(h=>{if(!h)return;let g=document.createElement("div");g.className=h.match(/WAF BLOCK/i)?"kp-log-line-err":h.match(/WAF DETECT/i)?"kp-log-line-warn":h.match(/error|crit|emerg/i)?"kp-log-line-err":h.match(/warn/i)?"kp-log-line-warn":h.match(/info|notice/i)?"kp-log-line-info":"",g.textContent=h,n.appendChild(g)});n.childElementCount>Li;)n.removeChild(n.firstChild);l.checked&&(n.scrollTop=n.scrollHeight)}function p(){s&&(s.close(),s=null),a=!1,i.disabled=!1,o.disabled=!0,c&&(c.textContent="Disconnected")}i.addEventListener("click",()=>{p();let b=e.querySelector("#log-container").value,h=e.querySelector("#log-tail").value,g=location.protocol==="https:"?"wss":"ws",v=b==="waf"?`${g}://${location.host}/api/sites/${t}/logs/waf?tail=${h}`:b==="proxy"?`${g}://${location.host}/api/sites/${t}/logs/proxy?tail=${h}`:b==="access"?`${g}://${location.host}/api/sites/${t}/logs/proxy?tail=${h}`:`${g}://${location.host}/api/sites/${t}/logs?container=${b}&tail=${h}`;s=new WebSocket(v),s.onopen=()=>{a=!0,i.disabled=!0,o.disabled=!1,c&&(c.textContent=`Connected \u2014 ${b}`)},s.onmessage=x=>u(x.data),s.onerror=()=>{},s.onclose=()=>{a=!1,i.disabled=!1,o.disabled=!0,c&&(c.textContent="Disconnected")}}),o.addEventListener("click",p),r.addEventListener("click",()=>{n.innerHTML=""}),e.querySelector("#log-container").addEventListener("change",()=>{s&&s.readyState===WebSocket.OPEN&&(p(),i.click())});let m=S.go.bind(S);S.go=function(b,h={}){return s&&p(),m(b,h)}}var Ti=50;function ra(e){let t=[e.fname,e.lname].filter(Boolean).join(" ");return t?`${e.uname} (${t})`:e.uname}function Mt(){return`
        <div class="kp-card uk-padding uk-margin-top" id="managers-panel">
            <h3 class="kp-view-title uk-margin-bottom">Managers</h3>
            <p class="kp-muted uk-text-small uk-margin-small-bottom">
                Assigned managers have the same rights as the site owner on this site.
            </p>
            <p class="uk-text-small uk-margin-small-bottom">
                <span class="kp-label">Owner</span>&nbsp;<span id="mgr-owner">-</span>
            </p>
            <label class="kp-label" for="mgr-select">Assigned Managers</label>
            <select multiple class="uk-select kp-select" id="mgr-select" size="8"></select>
            <p class="kp-muted uk-text-small uk-margin-small-top">Hold Ctrl or Cmd to select more than one.</p>
            <div class="uk-flex uk-flex-right uk-margin-top">
                <button class="uk-button kp-btn-primary kp-btn-sm" id="mgr-save">
                    <span uk-icon="check"></span> Save Managers
                </button>
            </div>
        </div>`}async function At(e,t){let s=e.querySelector("#managers-panel");if(s)try{let[a,n]=await Promise.all([k.get(`/sites/${t}/managers`),k.get("/users")]),i=Array.isArray(n)?n:[],o=i.find(l=>l.id===a.owner_id);s.querySelector("#mgr-owner").textContent=o?ra(o):`User ${a.owner_id}`;let r=new Set(a.uids??[]);s.querySelector("#mgr-select").innerHTML=i.filter(l=>l.role===Ti&&!l.blocked&&l.id!==a.owner_id).map(l=>`<option value="${l.id}" ${r.has(l.id)?"selected":""}>${f(ra(l))}</option>`).join("")}catch(a){d.error("Failed to load site managers: "+a.message)}}function Rt(e,t){e.querySelector("#mgr-save")?.addEventListener("click",async()=>{let s=[...e.querySelectorAll("#mgr-select option:checked")].map(a=>parseInt(a.value,10));try{await k.put(`/sites/${t}/managers`,{uids:s}),d.success("Site managers saved")}catch(a){d.error(a.message)}})}function Ci(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';case"expired":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Expired certificate"></span>';case"mismatch":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Certificate does not match this domain"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function la(e,t){try{let s=await k.get(`/ssl-status?domain=${encodeURIComponent(e)}`),a=document.getElementById(`ssl-icon-${t}`);if(a&&(a.outerHTML=Ci(s.status)),s.status==="none"){let n=document.getElementById(`domain-link-${t}`);n&&(n.href=`http://${e}`)}}catch{}}function ca(e){e.forEach(t=>la(t.Domain,t.ID))}function da(e,t,s,a=0,n=null,i=[]){let o=e.SiteType!==3&&e.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${e.Name}</td></tr>
                            ${n?`<tr><td class="kp-muted">Parent</td><td><a href="javascript:void(0)" data-action="manage" data-id="${a}" style="color:var(--kp-cyan)">${n}</a></td></tr>`:""}
                            <tr><td class="kp-muted">Internal Port</td><td>:${e.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${V(e.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${ee(e)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${Z(e.SiteStatus)}</td></tr>
                            <tr><td class="kp-muted">Containers</td><td><div id="sd-health-badges" class="kp-health-badges"></div></td></tr>
                            <tr><td class="kp-muted">Created</td><td>${new Date(e.Created).toLocaleString()}</td></tr>
                        </tbody>
                    </table>
                </div>
                
                ${i.length?`
                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">Site Sync</h3>
                    <p class="kp-muted uk-text-small uk-margin-remove-bottom">
                        Push files and/or database from this site onto its parent or one of its clones.
                    </p>
                    <div class="uk-flex uk-margin-small-top" style="gap:8px">
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="sync-push-btn">
                            <span uk-icon="cloud-upload"></span> Push Site
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
                        ${t.length?t.map(ua).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
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
                            <tr>
                                <td class="kp-muted">Host</td>
                                <td>
                                    <div class="kp-sftp-hostip">
                                        <div class="kp-sftp-hostip-col">
                                            <span id="sftp-host-val" class="kp-mono">${location.hostname}</span>
                                            <button class="uk-button kp-btn-secondary kp-btn-sm kp-btn-copy" id="sftp-host-copy-btn" uk-tooltip="Copy the Host">
                                                <span uk-icon="icon: copy; ratio: 0.75"></span>
                                            </button>
                                        </div>
                                        <div class="kp-sftp-hostip-col uk-hidden" id="sftp-ip-col">
                                            <span id="sftp-ip-val" class="kp-mono"></span>
                                            <button class="uk-button kp-btn-secondary kp-btn-sm kp-btn-copy" id="sftp-ip-copy-btn" uk-tooltip="Copy the IP">
                                                <span uk-icon="icon: copy; ratio: 0.75"></span>
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr><td class="kp-muted">Port</td><td class="kp-mono">2222</td></tr>
                            <tr>
                                <td class="kp-muted">User</td>
                                <td>
                                    <span id="sftp-user-val" class="kp-mono">${s?.Username??e.Name}</span>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left kp-btn-copy" id="sftp-user-copy-btn" uk-tooltip="Copy the Username">
                                        <span uk-icon="icon: copy; ratio: 0.75"></span>
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td class="kp-muted">Password</td>
                                <td>
                                    <span id="sftp-pass-display" class="kp-mono kp-sftp-pass" data-revealed="0">\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022</span>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left kp-btn-copy" id="sftp-reveal-btn" uk-tooltip="Reveal the Password">
                                        <span uk-icon="icon: eye; ratio: 0.75"></span>
                                    </button>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left kp-btn-copy" id="sftp-copy-btn" uk-tooltip="Copy the Password">
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
        </div>`}function ua(e){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${e.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${e.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <a id="domain-link-${e.ID}" class="uk-text-small kp-mono" href="https://${e.Domain}" target="_blank" rel="noopener noreferrer" style="color:var(--kp-cyan)">${e.Domain}</a>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${e.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function pa(e,t){e.querySelector("#domain-add-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.remove("uk-hidden")}),e.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.add("uk-hidden")}),e.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#domain-add-input").value.trim();if(s)try{let a=await k.post(`/sites/${t}/domains`,{domain:s});e.querySelector("#domain-list").insertAdjacentHTML("beforeend",ua(a)),la(a.Domain,a.ID),e.querySelector("#domain-add-form").classList.add("uk-hidden"),e.querySelector("#domain-add-input").value="",d.success("Domain added")}catch(a){d.error(a.message)}}),e.querySelector("#domain-list")?.addEventListener("click",async s=>{let a=s.target.closest('[data-action="delete-domain"]');if(!(!a||!await P("Remove Domain","Remove this domain from the site?")))try{await k.delete(`/sites/${t}/domains/${a.dataset.did}`),a.closest("[data-domain-id]").remove(),d.success("Domain removed")}catch(i){d.error(i.message)}})}function ma(e,t,s=null,a=[]){e.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let o=e.querySelector("#sftp-regen-btn"),r=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let l=await k.post(`/sites/${t}/sftp-regen`),c=e.querySelector("#sftp-pass-display");if(c&&l?.password){c.textContent=l.password,c.dataset.revealed="1";let u=e.querySelector("#sftp-reveal-btn");u&&(u.innerHTML='<span uk-icon="icon: eye-slash; ratio: 0.75"></span>')}d.success("SFTP password regenerated"),S.go("site-detail",{id:String(t)})}catch(l){d.error(l.message),o.disabled=!1,o.innerHTML=r}});let n=async()=>(await k.get(`/sites/${t}/sftp-password`))?.password??"",i=(o,r)=>{if(navigator.clipboard)navigator.clipboard.writeText(o).then(()=>d.success(`${r} copied to clipboard`)).catch(()=>d.error(`Failed to copy ${r.toLowerCase()}`));else{let l=document.createElement("textarea");l.value=o,l.style.cssText="position:fixed;opacity:0",document.body.appendChild(l),l.select(),document.execCommand("copy"),document.body.removeChild(l),d.success(`${r} copied to clipboard`)}};e.querySelector("#sftp-reveal-btn")?.addEventListener("click",async()=>{let o=e.querySelector("#sftp-pass-display"),r=e.querySelector("#sftp-reveal-btn");if(!o)return;if(o.dataset.revealed==="1"){o.textContent="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",o.dataset.revealed="0",r.innerHTML='<span uk-icon="icon: eye; ratio: 0.75"></span>';return}let l=r.innerHTML;r.disabled=!0,r.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{o.textContent=await n(),o.dataset.revealed="1",r.innerHTML='<span uk-icon="icon: eye-slash; ratio: 0.75"></span>'}catch(c){d.error(c.message),r.innerHTML=l}finally{r.disabled=!1}}),e.querySelector("#sftp-copy-btn")?.addEventListener("click",async()=>{let o=e.querySelector("#sftp-copy-btn"),r=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let l=await n();l&&i(l,"Password")}catch(l){d.error(l.message)}finally{o.disabled=!1,o.innerHTML=r}}),e.querySelector("#sftp-user-copy-btn")?.addEventListener("click",()=>{let o=e.querySelector("#sftp-user-val")?.textContent.trim();o&&i(o,"Username")}),e.querySelector("#sftp-host-copy-btn")?.addEventListener("click",()=>{let o=e.querySelector("#sftp-host-val")?.textContent.trim();o&&i(o,"Host")}),e.querySelector("#sftp-ip-copy-btn")?.addEventListener("click",()=>{let r=e.querySelector("#sftp-ip-copy-btn")?.dataset.ip;r&&i(r,"IP")}),(async()=>{let o=e.querySelector("#sftp-ip-col"),r=e.querySelector("#sftp-ip-val"),l=e.querySelector("#sftp-ip-copy-btn");if(!(!o||!r||!l))try{let c=await k.get(`/sites/${t}/security/asn/lookup?q=${encodeURIComponent(location.hostname)}`);if(!c?.ip)return;r.textContent=c.ip,l.dataset.ip=c.ip,o.classList.remove("uk-hidden")}catch{}})(),e.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let o=e.querySelector("#pma-open-btn"),r=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let l=await k.post(`/sites/${t}/pma-token`);window.open(l.url,"_blank")}catch(l){d.error(l.message)}finally{o.disabled=!1,o.innerHTML=r}}),e.querySelector("#sync-push-btn")?.addEventListener("click",async()=>{let o=await fs(s,a,s.SiteType!==3&&s.PMAPort>0);if(!o)return;let r=a.find(u=>u.ID===o.target_id)?.Name??"target";try{await k.post(`/sites/${t}/push`,o)}catch(u){d.error(u.message);return}_("Push Running",`Backing up ${r}, then pushing ${s.Name} onto it.`);let l=Date.now()+1800*1e3,c=setInterval(async()=>{try{let u=await k.get(`/sites/${t}/push-status`);(!u?.active||Date.now()>l)&&(clearInterval(c),E(),u?.active?d.error("Push is taking longer than expected \u2014 check server logs for status"):u?.error?d.error(`Push failed: ${u.error}`):d.success(`Push to ${r} complete`))}catch{}},4e3)})}function ka(){return`
        <div class="kp-card uk-padding uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">Redirects</h3>
            <p class="kp-muted uk-text-small uk-margin-small-bottom">
                Rules are evaluated in order. The first matching source wins.
                Source is a path (e.g. <code>/old-page</code>) or a regular expression (e.g. <code>^/blog/(d+)$</code>). Target is a full URL or path.
            </p>
            <div id="redirects-list" class="uk-margin-small-bottom"></div>
            <div class="uk-flex uk-flex-middle uk-margin-small-top" style="gap:8px">
                <button type="button" class="uk-button kp-btn-ghost uk-button-small" id="redirect-add-btn">
                    <span uk-icon="plus"></span> Add Rule
                </button>
            </div>
            <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                <button type="button" class="uk-button kp-btn-primary" id="redirect-save-btn">
                    <span uk-icon="check"></span> Save
                </button>
            </div>
        </div>`}function ba(e="",t="",s=301){return`
        <div class="redirect-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <input class="uk-input kp-input redirect-source" type="text" placeholder="/old-path" value="${e}" style="flex:1">
            <input class="uk-input kp-input redirect-target" type="text" placeholder="https://example.com/new-path" value="${t}" style="flex:2">
            <select class="uk-select kp-select redirect-code" style="width:90px">
                <option value="301" ${s===301?"selected":""}>301</option>
                <option value="302" ${s===302?"selected":""}>302</option>
                <option value="307" ${s===307?"selected":""}>307</option>
                <option value="308" ${s===308?"selected":""}>308</option>
            </select>
            <a href="javascript:void(0);" class="kp-muted redirect-remove-btn" uk-icon="trash"></a>
        </div>`}async function ha(e){let t=document.getElementById("redirects-list");if(!t)return;t.innerHTML="";let s=await k.get(`/sites/${e}/redirects`);t.innerHTML=s.map(a=>ba(a.Source,a.Target,a.Code)).join("")}function fa(e,t){let s=new AbortController,a={signal:s.signal};e.addEventListener("click",n=>{n.target.closest("#redirect-add-btn")&&document.getElementById("redirects-list").insertAdjacentHTML("beforeend",ba()),n.target.closest(".redirect-remove-btn")&&n.target.closest(".redirect-row").remove()},a),e.addEventListener("click",async n=>{if(!n.target.closest("#redirect-save-btn"))return;let i=[...document.querySelectorAll(".redirect-row")].map(o=>({Source:o.querySelector(".redirect-source").value.trim(),Target:o.querySelector(".redirect-target").value.trim(),Code:parseInt(o.querySelector(".redirect-code").value,10)}));try{await k.put(`/sites/${t}/redirects`,i),d.success("Redirects saved")}catch(o){d.error(o.message||"Failed to save redirects")}},a),e.__redirectsAbort?.abort(),e.__redirectsAbort=s}function ga(e){return`
        <div class="kp-card uk-padding uk-margin-top" id="smtp-panel">
            <h3 class="kp-view-title uk-margin-bottom">Outbound SMTP</h3>
            ${e?'<p class="kp-muted uk-text-small">Your app can read <code>/etc/podnest/smtp/settings.json</code> when SMTP is enabled.</p>':""}
            <p class="kp-muted uk-text-small" id="site-smtp-status" role="status"></p>
            <button class="uk-button kp-btn-ghost kp-btn-sm" type="button" id="site-smtp-retry" hidden>Retry</button>

            <fieldset class="uk-fieldset" id="site-smtp-actions" disabled>
                <div class="uk-flex uk-grid-small uk-margin-small-bottom" uk-grid>
                    <div><button class="uk-button kp-btn-ghost kp-btn-sm" type="button" id="site-smtp-export">Export encrypted SMTP</button></div>
                    <div><label class="uk-button kp-btn-ghost kp-btn-sm">Import encrypted SMTP
                        <input type="file" id="site-smtp-import" accept=".pnm" hidden>
                    </label></div>
                </div>
                <form class="uk-form-stacked" id="site-smtp-settings">
                    <label class="kp-label">
                        <input class="uk-checkbox" type="checkbox" name="enabled">
                        Enable outbound SMTP
                    </label>

                    <div class="uk-grid-small uk-margin-small-top" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label" for="site-smtp-host">SMTP Host</label>
                            <input class="uk-input kp-input" id="site-smtp-host" name="host" type="text" autocomplete="off">
                        </div>
                        <div class="uk-width-1-4@s">
                            <label class="kp-label" for="site-smtp-port">Port</label>
                            <input class="uk-input kp-input" id="site-smtp-port" name="port" type="number" min="1" max="65535" step="1" required>
                        </div>
                        <div class="uk-width-1-4@s">
                            <label class="kp-label" for="site-smtp-encryption">Encryption</label>
                            <select class="uk-select kp-select" id="site-smtp-encryption" name="encryption">
                                <option value="starttls">STARTTLS</option>
                                <option value="tls">TLS</option>
                            </select>
                        </div>
                        <div class="uk-width-1-3@s">
                            <label class="kp-label" for="site-smtp-username">Username</label>
                            <input class="uk-input kp-input" id="site-smtp-username" name="username" type="text" autocomplete="off">
                        </div>
                        <div class="uk-width-1-3@s">
                            <label class="kp-label" for="site-smtp-from-email">From Email</label>
                            <input class="uk-input kp-input" id="site-smtp-from-email" name="from_email" type="email">
                        </div>
                        <div class="uk-width-1-3@s">
                            <label class="kp-label" for="site-smtp-from-name">From Name</label>
                            <input class="uk-input kp-input" id="site-smtp-from-name" name="from_name" type="text">
                        </div>
                    </div>

                    <button class="uk-button kp-btn-primary kp-btn-sm uk-margin-small-top" type="submit">Save Settings</button>
                </form>

                <hr class="kp-divider">

                <form class="uk-form-stacked" id="site-smtp-credentials">
                    <label class="kp-label" for="site-smtp-password">SMTP Password</label>
                    <p class="kp-muted uk-text-small uk-margin-small" id="site-smtp-password-state" role="status"></p>
                    <input class="uk-input kp-input" id="site-smtp-password" type="password" autocomplete="new-password" maxlength="4096" required>
                    <div class="uk-flex uk-flex-wrap uk-margin-small-top uk-grid-small" uk-grid>
                        <div><button class="uk-button kp-btn-primary kp-btn-sm" type="submit">Save Password</button></div>
                        <div><button class="uk-button kp-btn-ghost kp-btn-sm" id="site-smtp-remove" type="button">Remove Password</button></div>
                    </div>
                </form>

                <hr class="kp-divider">

                <form class="uk-form-stacked" id="site-smtp-test">
                    <label class="kp-label" for="site-smtp-recipient">Test Recipient</label>
                    <input class="uk-input kp-input" id="site-smtp-recipient" type="email" maxlength="254" required>
                    <button class="uk-button kp-btn-ghost kp-btn-sm uk-margin-small-top" type="submit">Send Test Email</button>
                </form>
            </fieldset>
        </div>`}function va(e,t,s){let a=`/sites/${s}/smtp`,n=e.querySelector("#site-smtp-actions"),i=e.querySelector("#site-smtp-status"),o=e.querySelector("#site-smtp-retry"),r=e.querySelector("#site-smtp-settings"),l=e.querySelector("#site-smtp-credentials"),c=e.querySelector("#site-smtp-password"),u=e.querySelector("#site-smtp-password-state"),p=e.querySelector("#site-smtp-remove"),m=e.querySelector("#site-smtp-test"),b=e.querySelector("#site-smtp-recipient"),h=m.querySelector('button[type="submit"]'),g=!1,v=!1,x=!1,y=!1,L=()=>{u.textContent=y?"Password configured":"No password configured",p.disabled=!y,h.disabled=!x||!y};e.querySelector("#site-smtp-export").addEventListener("click",async()=>{try{await ke(`/api${a}/export`,`site-${s}-smtp.pnm`)}catch($){d.error($.message)}});let w=e.querySelector("#site-smtp-import");w.addEventListener("change",async()=>{let $=w.files[0];if($)try{if(!await be(`/api${a}/import`,$))return;g=!1,await T(),d.success("SMTP settings imported")}catch(M){d.error(M.message)}finally{w.value=""}});let T=async()=>{if(!(g||v)){v=!0,o.hidden=!0,i.textContent="Loading SMTP settings\u2026";try{let $=await k.get(a);if(!$)return;x=$.enabled==="true",y=$.password_set==="true",r.elements.enabled.checked=x,r.elements.host.value=$.host??"",r.elements.port.value=$.port??"587",r.elements.encryption.value=$.encryption??"starttls",r.elements.username.value=$.username??"",r.elements.from_email.value=$.from_email??"",r.elements.from_name.value=$.from_name??"",L(),g=!0,n.disabled=!1,i.textContent=""}catch($){i.textContent=$.message,o.hidden=!1}finally{v=!1}}},C=async $=>{if(!(v||!g)){v=!0,n.disabled=!0;try{await $()}catch(M){e.isConnected&&d.error(M.message)}finally{v=!1,n.disabled=!1,L()}}};t.addEventListener("click",T),o.addEventListener("click",T),r.addEventListener("submit",$=>{$.preventDefault(),C(async()=>{let M=r.elements,O=M.enabled.checked;if(O&&!y){d.error("Save the SMTP password before enabling outbound SMTP.");return}await k.put(a,{enabled:String(O),host:M.host.value.trim(),port:M.port.value,encryption:M.encryption.value,username:M.username.value.trim(),from_email:M.from_email.value.trim(),from_name:M.from_name.value.trim()},105e3)&&(x=O,e.isConnected&&d.success("SMTP settings saved"))})}),l.addEventListener("submit",$=>{$.preventDefault(),C(async()=>{let M=k.put(`${a}/password`,{password:c.value},105e3);c.value="";let O=await M;O&&(y=O.password_set==="true",e.isConnected&&d.success("SMTP password saved"))})}),p.addEventListener("click",()=>{C(async()=>{!await P("Remove SMTP Password","Removing the password disables outbound SMTP for this site.")||!await k._req("DELETE",`${a}/password`,void 0,105e3)||(c.value="",y=!1,x=!1,r.elements.enabled.checked=!1,e.isConnected&&d.success("SMTP password removed"))})}),m.addEventListener("submit",$=>{$.preventDefault(),C(async()=>{await k.post(`${a}/test`,{recipient:b.value.trim()})&&e.isConnected&&d.success("SMTP server accepted the test email")})})}var ye=[{id:"ab-threshold",key:"threshold",api:"Threshold",mult:1,label:"Error Responses",help:"4xx/5xx responses within the window that trigger the 429."},{id:"ab-window",key:"window_secs",api:"WindowSecs",mult:1,label:"Window (seconds)",help:"Span the error responses are counted over."},{id:"ab-cooldown",key:"cooldown_secs",api:"CooldownSecs",mult:60,label:"429 Cooldown (minutes)",help:"Hitting the limit again during the cooldown converts it to a ban."},{id:"ab-ban",key:"ban_secs",api:"BanSecs",mult:60,label:"Ban Length (minutes)",help:"How long a ban lasts."},{id:"ab-strikes",key:"perm_strikes",api:"PermStrikes",mult:1,label:"Bans Before Permanent",help:"Bans within the strike window that make the ban permanent."},{id:"ab-strike-win",key:"perm_window_secs",api:"PermWindowSecs",mult:3600,label:"Strike Window (hours)",help:"Span the bans are counted over."}],Ht={id:"ab-escalate",key:"escalate_sites",api:"EscalateSites",mult:1,label:"Sites Before Global Ban",help:"An IP banned on this many sites is banned on all of them."},Nt=[{id:"ab-unknown-threshold",key:"unknown_threshold",api:"UnknownThreshold",mult:1,label:"Unknown-Domain Hits",help:"Requests for unregistered domains within the window that trigger the 429."},{id:"ab-unknown-window",key:"unknown_window_secs",api:"UnknownWindowSecs",mult:1,label:"Unknown-Domain Window (seconds)",help:"Span the unregistered-domain requests are counted over."}],ve=e=>e?`/sites/${e}/security/autoban`:"/security/autoban";function Ze(e=null){let t=e?ye:[...ye,Ht,...Nt];return`
        <div id="autoban-panel">

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <ul class="kp-accordion uk-margin-remove" uk-accordion>
                    <li>
                        <a class="uk-accordion-title" href="#"><h3 class="kp-view-title">Auto-Ban Settings</h3></a>
                        <div class="uk-accordion-content">
                            <div class="uk-flex uk-flex-between uk-flex-top uk-margin-small-bottom" style="gap:8px">
                                <p class="kp-muted uk-text-small uk-margin-remove">
                                    ${e?"Counts this site's 4xx/5xx responses per IP. Leave a field blank to inherit the global value shown.":"The global scope counts hits on unregistered domains using the Unknown-Domain fields; the remaining fields are the per-site defaults unless a site overrides them, and the cooldown and ban values apply to both."}
                                    Bypassed and whitelisted IPs are never counted.
                                </p>
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="ab-save" uk-tooltip="Save Auto-Ban Settings">
                                    <span uk-icon="check"></span>
                                </button>
                            </div>
                            ${e?`
                            <div class="uk-margin-small-bottom">
                                <label class="kp-label">
                                    <input class="uk-checkbox" type="checkbox" id="ab-enabled">
                                    &nbsp;Enable auto-ban for this site
                                </label>
                            </div>`:""}
                            <div class="uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m" uk-grid>
                                ${t.map(s=>`
                                <div>
                                    <label class="kp-label" for="${s.id}">${s.label}</label>
                                    <input class="uk-input kp-input" id="${s.id}" type="number" min="1" step="1">
                                    <p class="kp-muted uk-text-small uk-margin-small-top">${s.help}</p>
                                </div>`).join("")}
                            </div>
                        </div>
                    </li>
                </ul>
            </div>

            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Banned IPs</h3>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="ab-refresh" uk-tooltip="Refresh the list">
                        <span uk-icon="refresh"></span>
                    </button>
                </div>
                <div id="ab-list"><span class="kp-muted uk-text-small">Loading\u2026</span></div>
            </div>
        </div>`}function Pi(e){if(!e.length)return'<p class="kp-muted uk-text-small uk-margin-remove">No IPs are currently banned.</p>';let t=H();return`
        <div class="uk-overflow-auto">
        <table class="uk-table uk-table-divider uk-table-small uk-table-middle kp-fm-table">
            <thead>
                <tr>
                    <th>IP</th>
                    <th>Hits</th>
                    <th>Strikes</th>
                    <th>Banned</th>
                    <th>Expires</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${e.map(a=>{let n=!a.Expires;return`
        <tr>
            <td class="kp-mono">${f(a.IP)}</td>
            <td>${a.Hits}</td>
            <td>${a.Strikes}</td>
            <td>${new Date(a.Created).toLocaleString()}</td>
            <td>${n?'<span class="kp-muted">Permanent</span>':new Date(a.Expires).toLocaleString()}</td>
            <td>
                <div class="uk-flex uk-flex-right" style="gap:4px">
                    ${n?"":`
                    <button class="uk-button kp-btn-ghost kp-btn-sm" data-ab-action="permanent" data-id="${a.ID}" uk-tooltip="Ban permanently">
                        <span uk-icon="lock"></span>
                    </button>`}
                    ${t?`
                    <button class="uk-button kp-btn-ghost kp-btn-sm" data-ab-action="allow" data-id="${a.ID}" uk-tooltip="Allow \u2014 add to Security Bypass">
                        <span uk-icon="check"></span>
                    </button>`:""}
                    <button class="uk-button kp-btn-danger kp-btn-sm" data-ab-action="remove" data-id="${a.ID}" uk-tooltip="Remove the ban">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`}).join("")}</tbody>
        </table>
        </div>`}async function Dt(e,t){let s=e.querySelector("#ab-list");try{let a=await k.get(ve(t));s.innerHTML=Pi(a??[])}catch(a){s.innerHTML=`<p class="kp-muted uk-text-small uk-margin-remove">Failed to load bans: ${f(a.message)}</p>`}}async function _i(e,t){try{let s=await k.get(`${ve(t)}/settings`),a=t?s.global:s,n=t?s.override:s;(t?ye:[...ye,Ht,...Nt]).forEach(r=>{let l=e.querySelector(`#${r.id}`);l&&(l.placeholder=String(a[r.api]/r.mult),l.value=n[r.api]==null?"":String(n[r.api]/r.mult))});let o=e.querySelector("#ab-enabled");o&&(o.checked=!!s.override?.Enabled)}catch(s){d.error("Failed to load auto-ban settings: "+s.message)}}async function Ii(e,t){let s=t?ye:[...ye,Ht,...Nt],a={};for(let n of s){let i=e.querySelector(`#${n.id}`).value.trim();if(i===""){if(!t)throw new Error(`${n.label} is required`);a[n.key]=null;continue}let o=Number(i);if(!Number.isInteger(o)||o<1)throw new Error(`${n.label} must be a whole number above 0`);a[n.key]=o*n.mult}t&&(a.enabled=e.querySelector("#ab-enabled").checked),await k.put(`${ve(t)}/settings`,a)}function et(e,t=null){let s=e.querySelector("#autoban-panel");s&&(s.querySelector("#ab-save")?.addEventListener("click",async a=>{let n=a.currentTarget,i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await Ii(s,t),d.success("Auto-ban settings saved")}catch(o){d.error(o.message)}finally{n.disabled=!1,n.innerHTML=i}}),s.querySelector("#ab-refresh")?.addEventListener("click",()=>Dt(s,t)),s.querySelector("#ab-list")?.addEventListener("click",async a=>{let n=a.target.closest("[data-ab-action]");if(!n)return;let i=n.dataset.id,o=n.dataset.abAction,r=n.closest("tr")?.querySelector("td")?.textContent??"this IP";try{if(o==="permanent"){if(!await P("Ban Permanently",`Ban ${r} permanently? It stays banned until removed.`))return;await k.post(`${ve(t)}/${i}/permanent`),d.success(`${r} banned permanently`)}else if(o==="allow"){if(!await P("Allow IP",`Add ${r} to Security Bypass? It will skip every security check, including the WAF, on all sites.`))return;await k.post(`${ve(t)}/${i}/allow`),d.success(`${r} added to Security Bypass`)}else if(o==="remove"){if(!await P("Remove Ban",`Remove the ban on ${r}? Its strike history is cleared too.`))return;await k.delete(`${ve(t)}/${i}`),d.success(`Ban on ${r} removed`)}await Dt(s,t)}catch(l){d.error(l.message)}}),_i(s,t),Dt(s,t))}function Bi(e){return`
        <!-- tab pills -->
        <ul class="kp-tab-pills" id="kp-waf-pills">
            <li data-tab="crs"><a href="#"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> Core Rule Set</a></li>
            <li data-tab="autoban"><a href="#"><span uk-icon="icon: ban; ratio: 0.85"></span> Auto-Ban</a></li>
        </ul>

        <!-- switcher panels -->
        <ul class="uk-switcher uk-margin-large-bottom" id="kp-waf-switcher">

            <!-- core rule set -->
            <li>
                <div class="kp-card uk-padding">
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
                </div>
            </li>

            <!-- auto-ban -->
            <li>${Ze(e)}</li>

        </ul>`}function Ut(e,t,s=null){let a=e.querySelector("#kp-waf-pills"),n=e.querySelector("#kp-waf-switcher");if(!a||!n)return;let i=[...a.querySelectorAll(":scope > li")],o=(r,l)=>{if(UIkit.switcher(n).show(r),i.forEach((u,p)=>u.classList.toggle("kp-pill-active",p===r)),!l)return;let c=i[r].dataset.tab;history.replaceState(null,"",s?`#site-detail/${s}/${c}`:r===0?"#waf":`#waf/${c}`)};i.forEach((r,l)=>{r.querySelector(":scope > a").addEventListener("click",c=>{c.preventDefault(),o(l,!0)})}),o(Math.max(0,i.findIndex(r=>r.dataset.tab===t)),!1)}async function Ft(e,t){let s=document.getElementById("waf-tab-panel");if(!s)return;s.innerHTML=Bi(e),Ut(s,t,e),et(s,e);let a=document.getElementById("waf-export-btn");a&&(a.href=`/api/sites/${e}/waf/export`);try{let n=await k.get(`/sites/${e}/waf`),i=document.getElementById("waf-override"),o=document.getElementById("waf-site-exclusions");i&&(i.value=String(n.Override??0)),o&&(o.value=n.Exclusions??"");let r=document.getElementById("waf-plugins-list");if(r){let[l,c]=await Promise.all([k.get(`/sites/${e}/waf/available-plugins`),k.get("/settings/waf/plugins"),k.get(`/sites/${e}/waf/plugins`)]),u=new Set(c??[]);!l||l.length===0?r.innerHTML='<span class="kp-muted uk-text-small">No plugins found in local CRS install.</span>':window.matchMedia("(max-width: 959px)").matches?r.innerHTML=`
                    <select multiple class="uk-select kp-select waf-plugin-select" size="${Math.min(l.length,8)}">
                        ${l.map(p=>`
                        <option value="${p}" ${u.has(p)?"selected":""}>${p}</option>
                        `).join("")}
                    </select>`:(r.innerHTML=`
                    <div class="waf-plugin-pills">
                        ${l.map(p=>`
                        <span class="waf-plugin-pill ${u.has(p)?"active":""}"
                            data-plugin="${p}">${p}</span>
                        `).join("")}
                    </div>`,r.querySelectorAll(".waf-plugin-pill").forEach(p=>{p.addEventListener("click",()=>p.classList.toggle("active"))}))}}catch(n){d.error("Failed to load WAF settings: "+n.message)}}function ya(e,t,s){e.addEventListener("submit",async a=>{if(a.target.id!=="waf-override-form")return;a.preventDefault();let n=a.target.querySelector('[type="submit"]'),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let o=new FormData(a.target),r={override:parseInt(o.get("override"),10),exclusions:o.get("exclusions").trim()};try{await k.put(`/sites/${t}/waf`,r);let l=document.querySelector(".waf-plugin-select"),c=l?[...l.selectedOptions].map(u=>u.value):[...document.querySelectorAll(".waf-plugin-pill.active")].map(u=>u.dataset.plugin);await k.put(`/sites/${t}/waf/plugins`,c),d.success("WAF override saved \u2014 engine recompiling in background")}catch(l){d.error(l.message)}finally{n.disabled=!1,n.innerHTML=i}},{signal:s}),e.addEventListener("change",async a=>{if(a.target.id!=="waf-import")return;let n=a.target.files[0];if(!n)return;let i=new FormData;i.append("file",n);try{let o=await fetch(`/api/sites/${t}/waf/import`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:i}),r=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(r?.error||`HTTP ${o.status}`);await Ft(t),d.success("WAF settings imported")}catch(o){d.error(o.message)}finally{a.target.value=""}},{signal:s})}var qi=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function wa(e){return`
        <div class="kp-wpcli">
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${qi.map(t=>`
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
        </div>`}function xa(e,t){let s=e.querySelector("#wpcli-output"),a=e.querySelector("#wpcli-input"),n=e.querySelector("#wpcli-run"),i=e.querySelector("#wpcli-clear"),o=e.querySelector("#wpcli-status"),r=[],l=-1;function c(m,b=""){m.split(`
`).forEach(h=>{if(!h)return;let g=document.createElement("div");b?g.className=b:g.className=h.match(/error|fatal|critical/i)?"kp-log-line-err":h.match(/warning|warn/i)?"kp-log-line-warn":h.match(/success|done\]/i)?"kp-log-line-info":"",g.textContent=h,s.appendChild(g)}),s.scrollTop=s.scrollHeight}function u(m){if(m=m.trim(),!m)return;r.unshift(m),l=-1,c(`wp> ${m}`,"kp-log-line-info"),a.disabled=!0,n.disabled=!0,o&&(o.textContent="Running...");let b=location.protocol==="https:"?"wss":"ws",h=new WebSocket(`${b}://${location.host}/api/sites/${t}/wpcli`);h.onopen=()=>{h.send(JSON.stringify({command:m}))},h.onmessage=g=>{let v=g.data;if(v.trim()==="[done]"){h.close();return}if(v.startsWith("[info]")){c(v,"kp-muted");return}if(v.startsWith("[error]")){c(v,"kp-log-line-err");return}c(v)},h.onerror=()=>{c("[error] WebSocket connection failed","kp-log-line-err")},h.onclose=()=>{a.disabled=!1,n.disabled=!1,o&&(o.textContent="Ready"),a.focus()}}n.addEventListener("click",()=>{u(a.value),a.value=""}),a.addEventListener("keydown",m=>{if(m.key==="Enter"){u(a.value),a.value="",l=-1;return}if(m.key==="ArrowUp"){m.preventDefault(),l<r.length-1&&(l++,a.value=r[l]);return}m.key==="ArrowDown"&&(m.preventDefault(),l>0?(l--,a.value=r[l]):(l=-1,a.value=""))}),e.querySelectorAll('[data-action="wpcli-quick"]').forEach(m=>{m.addEventListener("click",()=>{let b=m.dataset.cmd;if(b.startsWith("search-replace")){a.value=b,a.focus();let h=b.indexOf("''")+1;a.setSelectionRange(h,h);return}u(b)})}),i.addEventListener("click",()=>{s.innerHTML=""});let p=S.go.bind(S);S.go=function(m,b={}){return p(m,b)},a.focus()}var Mi=[{label:"Core Only",scope:"core"},{label:"Themes Only",scope:"themes"},{label:"Plugins Only",scope:"plugins"},{label:"All",scope:"all"}];function $a(){return`
        <div id="wpupdates-panel">
            <!-- wp-admin sso -->
            <div class="kp-card uk-padding-small uk-margin-small-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">wp-admin Sign-In</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="wpsso-open" uk-tooltip="Sign in to wp-admin in a new tab">
                        <span uk-icon="sign-in"></span> Open wp-admin
                    </button>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    Signs in as the administrator selected below \u2014 every panel user signs in as the same account.
                    With none selected, the site's first administrator is used.
                </p>
                <div class="uk-flex uk-flex-middle" style="gap:8px;max-width:480px">
                    <select class="uk-select kp-input" id="wpsso-user" disabled>
                        <option value="0">First administrator (default)</option>
                    </select>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-top" id="wpsso-error" hidden></p>
            </div>

            <!-- updates -->
            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Updates</h3>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="wpu-check" uk-tooltip="Check for updates now">
                        <span uk-icon="refresh"></span>
                    </button>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    Checked nightly at 11 PM. Last checked: <span id="wpu-checked">never</span>
                </p>
                <div id="wpu-status">
                    <div uk-spinner="ratio: 0.6"></div>
                </div>

                <div class="kp-log-controls uk-margin-small-top" style="flex-wrap:wrap;gap:6px">
                    ${Mi.map(e=>`
                        <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="wpu-run" data-scope="${e.scope}">
                            ${e.label}
                        </button>`).join("")}
                </div>

                <div class="kp-log-header uk-margin-small-top">
                    <div class="kp-log-dot kp-log-dot-red"></div>
                    <div class="kp-log-dot kp-log-dot-yellow"></div>
                    <div class="kp-log-dot kp-log-dot-green"></div>
                    <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px" id="wpu-run-status">Ready</span>
                </div>
                <div class="kp-log-wrap" id="wpu-output" style="height:400px"></div>
            </div>
        </div>`}function Sa(e,t){return t?.length?`
        <h4 class="uk-margin-small-top uk-margin-remove-bottom uk-text-small">${e} (${t.length})</h4>
        <div class="uk-overflow-auto">
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead><tr><th>Name</th><th>Installed</th><th>Available</th></tr></thead>
            <tbody>
                ${t.map(s=>`
                    <tr>
                        <td>${f(s.title||s.name)}<div class="kp-muted uk-text-small kp-mono">${f(s.name)}</div></td>
                        <td class="kp-mono">${f(s.version)}</td>
                        <td class="kp-mono">${f(s.update_version)}</td>
                    </tr>`).join("")}
            </tbody>
        </table>
        </div>`:`<p class="kp-muted uk-text-small uk-margin-small-top">${e}: up to date.</p>`}function Ai(e){return e?`
        ${e.error?`<p class="kp-log-line-err uk-text-small uk-margin-small-bottom">${f(e.error)}</p>`:""}
        <p class="uk-text-small uk-margin-remove">
            Core: <span class="kp-mono">${f(e.core_version||"unknown")}</span>
            ${e.core_update?`\u2192 <span class="kp-mono kp-log-line-warn">${f(e.core_update)}</span> available`:'<span class="kp-muted">(up to date)</span>'}
        </p>
        ${Sa("Plugins",e.plugins)}
        ${Sa("Themes",e.themes)}`:'<p class="kp-muted uk-text-small uk-margin-remove">Not checked yet.</p>'}function Ea(e,t){e.querySelector("#wpu-status").innerHTML=Ai(t),e.querySelector("#wpu-checked").textContent=t?.checked?new Date(t.checked).toLocaleString():"never"}async function Wt(e,t){if(e.querySelector("#wpupdates-panel")){try{let{status:s}=await k.get(`/sites/${t}/wpupdates`);Ea(e,s)}catch(s){e.querySelector("#wpu-status").innerHTML=`<p class="kp-log-line-err uk-text-small">${f(s.message)}</p>`}try{let s=await k.get(`/sites/${t}/wpsso`),a=e.querySelector("#wpsso-user");a.innerHTML='<option value="0">First administrator (default)</option>'+s.admins.map(i=>`
            <option value="${i.id}" ${i.id===s.selected?"selected":""}>
                ${f(i.display_name||i.login)} (${f(i.login)})
            </option>`).join(""),s.selected&&!s.admins.some(i=>i.id===s.selected)&&a.insertAdjacentHTML("beforeend",`<option value="${s.selected}" selected>User #${s.selected}</option>`),a.disabled=!1;let n=e.querySelector("#wpsso-error");n.hidden=!s.error,n.textContent=s.error?`Could not list administrators: ${s.error}`:""}catch(s){d.error("Failed to load wp-admin sign-in settings: "+s.message)}}}function La(e,t){let s=e.querySelector("#wpu-output"),a=e.querySelector("#wpu-run-status"),n=e.querySelector("#wpu-check"),i=e.querySelectorAll('[data-action="wpu-run"]');function o(l,c=""){l.split(`
`).forEach(u=>{if(!u)return;let p=document.createElement("div");p.className=c||(u.match(/error|fatal|critical/i)?"kp-log-line-err":u.match(/warning|warn/i)?"kp-log-line-warn":u.match(/success|^\$ wp|done\]/i)?"kp-log-line-info":""),p.textContent=u,s.appendChild(p)}),s.scrollTop=s.scrollHeight}function r(l,c){i.forEach(u=>{u.disabled=l}),n.disabled=l,a.textContent=c}e.querySelector("#wpsso-user").addEventListener("change",async l=>{try{await k.put(`/sites/${t}/wpsso`,{wp_user_id:parseInt(l.target.value,10)}),d.success("wp-admin sign-in user saved")}catch(c){d.error(c.message)}}),e.querySelector("#wpsso-open").addEventListener("click",async()=>{let l=window.open("","_blank");l&&(l.opener=null);try{let{url:c}=await k.post(`/sites/${t}/wpsso/login`);l?l.location.href=c:window.location.href=c}catch(c){l?.close(),d.error(c.message)}}),n.addEventListener("click",async()=>{let l=n.innerHTML;r(!0,"Checking..."),n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let{status:c}=await k.post(`/sites/${t}/wpupdates/check`,void 0,3e5);Ea(e,c),d.success("Update check complete")}catch(c){d.error(c.message)}finally{n.innerHTML=l,r(!1,"Ready")}}),i.forEach(l=>{l.addEventListener("click",async()=>{let c=l.textContent.trim();if(!await P("Apply Updates",`Run "${c}" updates on this site now? Take a backup first if you need a way back.`))return;r(!0,`Running ${c}...`),o(`== ${c} ==`,"kp-log-line-info");let u=location.protocol==="https:"?"wss":"ws",p=new WebSocket(`${u}://${location.host}/api/sites/${t}/wpupdates/run?scope=${encodeURIComponent(l.dataset.scope)}`);p.onmessage=m=>{let b=m.data;if(b.trim()==="[done]"){o(b,"kp-log-line-info"),p.close();return}if(b.trimStart().startsWith("[error]")){o(b,"kp-log-line-err"),p.close();return}o(b)},p.onerror=()=>{o("[error] WebSocket connection failed","kp-log-line-err")},p.onclose=()=>{r(!1,"Ready"),Wt(e,t)}})})}var ne=null,J=null;function Ta(e,t,s){let a=e.querySelector("#kp-site-pills"),n=e.querySelector("#kp-site-switcher"),i=e.querySelector("#kp-manage-pill"),o=e.querySelector("#kp-manage-dropdown");if(!a||!n)return;let r=["#kp-sec-pills","#kp-waf-pills","#kp-db-pills"].map(m=>e.querySelector(m)).filter(Boolean),l=m=>[...n.children].findIndex(b=>b.contains(m));function c(m,b=!1){UIkit.switcher(n).show(m),a.querySelectorAll(":scope > li[data-pill]").forEach(v=>v.classList.remove("kp-pill-active")),b?(i?.classList.add("kp-pill-active"),o?.querySelectorAll("a[data-switcher]").forEach(v=>{v.classList.toggle("kp-dd-active",parseInt(v.dataset.switcher,10)===m)})):(i?.classList.remove("kp-pill-active"),o?.querySelectorAll("a[data-switcher]").forEach(v=>v.classList.remove("kp-dd-active")));let g=r.find(v=>l(v)===m)?.querySelector(":scope > li.kp-pill-active")?.dataset.tab;history.replaceState(null,"",g?`#site-detail/${t}/${g}`:`#site-detail/${t}`)}a.querySelectorAll(":scope > li[data-pill] > a").forEach(m=>{m.addEventListener("click",b=>{b.preventDefault();let h=parseInt(m.closest("li").dataset.pill,10);c(h,!1)})}),i?.querySelector(".kp-pill-dropdown-btn")?.addEventListener("click",m=>{m.stopPropagation(),o.hidden=!o.hidden,i.classList.toggle("kp-pill-active",!o.hidden)}),o?.querySelectorAll("a[data-switcher]").forEach(m=>{m.addEventListener("click",b=>{b.preventDefault(),o.hidden=!0,c(parseInt(m.dataset.switcher,10),!0)})}),document.addEventListener("click",m=>{o&&!i.contains(m.target)&&(o.hidden=!0)},{capture:!0});let p=s?r.find(m=>[...m.children].some(b=>b.dataset.tab===s)):null;p?c(l(p),!0):UIkit.switcher(n).show(1)}function Ri(){return`
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
        </div>`}function jt(e="",t="",s=!1,a=!1){return`
        <div class="rp-route-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <span>Host:</span><input class="uk-input kp-input" style="flex:1" placeholder="example.com" value="${e}" data-field="domain">
            <span>Upstream:</span><input class="uk-input kp-input" style="flex:2" placeholder="https://10.0.0.1:8080" value="${t}" data-field="upstream">
            <label style="white-space:nowrap;font-size:0.75rem;color:var(--kp-text-dim)" title="Send incoming domain as Host header instead of upstream hostname">
                <input type="checkbox" class="uk-checkbox" data-field="pass_host" ${s?"checked":""}> Pass Host
            </label>
            <label style="white-space:nowrap;font-size:0.75rem;color:var(--kp-text-dim)" title="Do not verify the upstream's TLS certificate. Insecure \u2014 only for self-signed or private-CA https upstreams you control">
                <input type="checkbox" class="uk-checkbox" data-field="skip_verify" ${a?"checked":""}> Skip TLS Verify
            </label>
            <button class="uk-button kp-btn-ghost kp-btn-sm rp-remove-row" uk-tooltip="Remove"><span uk-icon="trash"></span></button>
        </div>`}async function Di(e){let t=document.getElementById("rp-routes-list");if(t)try{let s=await k.get(`/sites/${e}/rp-routes`);t.innerHTML=s.length?s.map(a=>jt(a.Domain,a.Upstream,a.PassHost,a.SkipVerify)).join(""):jt()}catch(s){d.error("Failed to load routes: "+s.message)}}function Hi(e,t){e.addEventListener("click",async s=>{if(s.target.closest("#rp-add-row")){document.getElementById("rp-routes-list").insertAdjacentHTML("beforeend",jt());return}if(s.target.closest(".rp-remove-row")){s.target.closest(".rp-route-row").remove();return}if(!s.target.closest("#rp-save-btn"))return;let a=s.target.closest("#rp-save-btn"),n=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let i=[...document.querySelectorAll(".rp-route-row")].map(o=>({Domain:o.querySelector('[data-field="domain"]').value.trim(),Upstream:o.querySelector('[data-field="upstream"]').value.trim(),PassHost:o.querySelector('[data-field="pass_host"]').checked,SkipVerify:o.querySelector('[data-field="skip_verify"]').checked})).filter(o=>o.Domain&&o.Upstream);try{await k.put(`/sites/${t}/rp-routes`,i),d.success("Routes saved")}catch(o){d.error(o.message)}finally{a.disabled=!1,a.innerHTML=n}},{signal:ne.signal})}function Ni(e){return e.endsWith("-nginx")?"world":e.endsWith("-php")?"code":e.endsWith("-db")?"database":e.endsWith("-redis")?"server":e.endsWith("-varnish")?"grid":e.endsWith("-pma")?"table":e.endsWith("-app")?"laptop":"bolt"}function Ca(e){let t=e.split("-").pop();return{nginx:"Nginx",php:"PHP-FPM",db:"MariaDB",redis:"Redis",varnish:"Varnish",pma:"phpMyAdmin",app:"App"}[t]??t}function Pa(e){switch(e){case"running":return"var(--kp-success)";case"exited":case"stopped":case"dead":return"var(--kp-danger)";case"created":case"configured":case"initialized":case"paused":case"stopping":case"restarting":return"var(--kp-warning)";default:return"var(--kp-text-dim)"}}function Ui(e){return!e||!e.length?"":e.filter(t=>!t.name.endsWith("-infra")).map(t=>`
            <span class="kp-health-badge"
                data-container="${f(t.name)}"
                title="Restart the Container"
                style="cursor:pointer;color:${Pa(t.status)}">
                <span uk-icon="icon: ${Ni(t.name)}; ratio: 1.1"></span>
                <span class="kp-health-badge-label">${f(Ca(t.name))}</span>
            </span>
        `).join("")}function Fi(e,t){J&&(J.close(),J=null);let s=document.getElementById("sd-health-badges");if(!s)return;let a=location.protocol==="https:"?"wss":"ws";J=new WebSocket(`${a}://${location.host}/api/sites/${t}/health/stream`);let n=[],i=()=>{s.innerHTML=Ui(n),s.querySelectorAll(".kp-health-badge").forEach(o=>{o.addEventListener("click",async()=>{o.style.color=Pa("restarting");let r=o.dataset.container,l=r.split("-").pop();try{await k.post(`/sites/${t}/containers/${l}/restart`),d.success(`${Ca(r)} restarted`)}catch(c){d.error(c.message)}i()})})};J.onmessage=o=>{try{n=JSON.parse(o.data),i()}catch{}},J.onerror=()=>{},J.onclose=()=>{J=null}}async function _a(e,{id:t,tab:s}){let[{site:a,domains:n,sftp:i},o,r]=await Promise.all([k.get(`/sites/${t}`),k.get("/sites"),k.get(`/sites/${t}/configs`)]),l=Array.isArray(o)?o:[],c=l.filter(y=>y.ID===a.ParentID||y.ParentID===a.ID),u=a.SiteType===1||a.SiteType===2,p=[1,2,4,5,7].includes(a.SiteType),m=a.SiteType===6,b=[1,2,4,5,7].includes(a.SiteType),h=[1,2,4,5,7].includes(a.SiteType),g=window.KP?.user?.role===99;if(ne&&ne.abort(),ne=new AbortController,e.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <div class="kp-site-nav-wrap">
                    <select id="sd-site-nav" class="uk-select kp-select">
                        ${l.map(y=>`<option value="${y.ID}" ${y.ID===a.ID?"selected":""}>${y.Name}</option>`).join("")}
                    </select>
                    <span class="kp-site-nav-arrow">&#9660;</span>
                </div>
                ${m?"":Z(a.SiteStatus)}
            </div>
            <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                ${m?"":`
                ${a.SiteStatus===1?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="stop" data-id="${t}" uk-tooltip="Stop the Site"><span uk-icon="ban"></span></button>`:`<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="start" data-id="${t}" uk-tooltip="Start the Site"><span uk-icon="play"></span></button>`}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="restart" data-id="${t}" uk-tooltip="Restart the Site"><span uk-icon="refresh"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="flush" data-id="${t}" uk-tooltip="Flush the Caches"><span uk-icon="bolt"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate" id="sd-recreate" uk-tooltip="Recreate &amp; Update the Pod"><span uk-icon="history"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-clone" uk-tooltip="Clone the Site"><span uk-icon="move"></span></button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-rename" uk-tooltip="Rename the Site"><span uk-icon="tag"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-edit" uk-tooltip="Edit the Site"><span uk-icon="pencil"></span></button>
            </div>
        </div>
 
        ${m?`
        <!-- tab pills (reverse proxy) -->
        <ul class="kp-tab-pills" id="kp-site-pills">
            <li data-pill="0"><a href="#">Routes</a></li>
            <li id="kp-manage-pill">
                <a href="javascript:void(0);" class="kp-pill-dropdown-btn">
                    Manage <span uk-icon="icon: chevron-down; ratio: 0.8"></span>
                </a>
                <div class="kp-pill-dropdown" id="kp-manage-dropdown" hidden>
                    <div class="kp-pill-dropdown-section">Config</div>
                    <a href="#" data-switcher="3"><span uk-icon="icon: bolt; ratio: 0.85"></span> Proxy Cache</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Security</div>
                    <a href="#" data-switcher="4"><span uk-icon="icon: lock; ratio: 0.85"></span> Security</a>
                    <a href="#" data-switcher="5"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> WAF</a>
                    <a href="#" data-switcher="6"><span uk-icon="icon: user; ratio: 0.85"></span> Basic Auth</a>
                    ${g?`<hr>
                    <div class="kp-pill-dropdown-section">Access</div>
                    <a href="#" data-switcher="managers"><span uk-icon="icon: users; ratio: 0.85"></span> Managers</a>`:""}
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="2"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${Ri()}</li>
            <li>${vt(t,a.SiteType)}</li>
            <li>${qt(t,a.SiteType)}</li>
            <li>${Tt(t,r[6])}</li>
            <li>${Te(t)}</li>
            <li id="waf-tab-panel"></li>
            <li>${$t()}</li>
            ${g?`<li>${Mt()}</li>`:""}
        </ul>
        `:`

        <!-- tab pills -->
        <ul class="kp-tab-pills" id="kp-site-pills">
            <li data-pill="0"><a href="#">Overview</a></li>
            <li id="kp-manage-pill">
                <a href="javascript:void(0);" class="kp-pill-dropdown-btn">
                    Manage <span uk-icon="icon: chevron-down; ratio: 0.8"></span>
                </a>
                <div class="kp-pill-dropdown" id="kp-manage-dropdown" hidden>
                    <div class="kp-pill-dropdown-section">Config</div>
                    <a href="#" data-switcher="2"><span uk-icon="icon: settings; ratio: 0.85"></span> Nginx</a>
                    ${u?'<a href="#" data-switcher="3"><span uk-icon="icon: code; ratio: 0.85"></span> PHP</a>':""}
                    <a href="#" data-switcher="${u?4:3}"><span uk-icon="icon: database; ratio: 0.85"></span> MariaDB</a>
                    <a href="#" data-switcher="${u?5:4}"><span uk-icon="icon: bolt; ratio: 0.85"></span> Proxy Cache</a>
                    <a href="#" data-switcher="${u?6:5}"><span uk-icon="icon: server; ratio: 0.85"></span> Redis</a>
                    <a href="#" data-switcher="${u?7:6}"><span uk-icon="icon: world; ratio: 0.85"></span> Varnish</a>
                    ${p?'<a href="#" id="sd-smtp-tab" data-switcher="smtp"><span uk-icon="icon: mail; ratio: 0.85"></span> SMTP</a>':""}
                    <hr>
                    <div class="kp-pill-dropdown-section">Security</div>
                    <a href="#" data-switcher="${u?9:8}"><span uk-icon="icon: lock; ratio: 0.85"></span> Security</a>
                    <a href="#" data-switcher="${u?10:9}"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> WAF</a>
                    <a href="#" data-switcher="${u?11:10}"><span uk-icon="icon: user; ratio: 0.85"></span> Basic Auth</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Tools</div>
                    ${a.SiteType===1?`<a href="#" data-switcher="${u?12:11}"><span uk-icon="icon: file-text; ratio: 0.85"></span> WP-CLI</a>`:""}
                    ${a.SiteType===1?'<a href="#" data-switcher="wordpress"><span uk-icon="icon: wordpress; ratio: 0.85"></span> WordPress</a>':""}
                    <a href="#" data-switcher="${a.SiteType===1?u?13:12:u?12:11}"><span uk-icon="icon: history; ratio: 0.85"></span> Backups</a>
                    ${h?'<a href="#" data-switcher="database"><span uk-icon="icon: table; ratio: 0.85"></span> Database</a>':""}
                    ${b?`<a href="#" data-switcher="${a.SiteType===1?u?14:13:u?13:12}"><span uk-icon="icon: clock; ratio: 0.85"></span> Crons</a>`:""}
                    <a href="#" data-switcher="${(a.SiteType===1?u?15:14:u?14:13)-(b?0:1)}"><span uk-icon="icon: forward; ratio: 0.85"></span> Redirects</a>
                    <a href="#" data-switcher="files"><span uk-icon="icon: folder; ratio: 0.85"></span> Files</a>
                    ${g?`<hr>
                    <div class="kp-pill-dropdown-section">Access</div>
                    <a href="#" data-switcher="managers"><span uk-icon="icon: users; ratio: 0.85"></span> Managers</a>`:""}
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="${u?8:7}"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels (driven by pills above) -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${da(a,n??[],i,a.ParentID??0,l.find(y=>y.ID===a.ParentID)?.Name??null,c)}</li>
            <li>${vt(t,a.SiteType)}</li>
            <li>${_e(t,1,r[1])}</li>
            ${u?`<li>${_e(t,2,r[2])}</li>`:""}
            <li>${_e(t,3,r[3])}</li>
            <li>${Tt(t,r[6])}</li>
            <li>${_e(t,4,r[4])}</li>
            <li>${js(t,r[5])}</li>
            <li>${qt(t,a.SiteType)}</li>
            <li>${Te(t)}</li>
            <li id="waf-tab-panel"></li>
            <li>${$t()}</li>
            ${a.SiteType===1?`<li>${wa(t)}</li>`:""}
            <li>${Us(t)}</li>
            ${b?`<li>${zs(t)}</li>`:""}
            <li>${ka()}</li>
            ${h?`<li>${Ys(t,a.SiteType)}</li>`:""}
            ${a.SiteType===1?`<li>${$a()}</li>`:""}
            ${g?`<li>${Mt()}</li>`:""}
            ${p?`<li>${ga(!u)}</li>`:""}
            <li>${na(t)}</li>
        </ul>`}`,document.getElementById("sd-back").addEventListener("click",()=>S.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>Hs(a)),document.getElementById("sd-rename").addEventListener("click",async()=>{let y=await hs(a.Name);if(!(!y||y===a.Name)){_("Renaming Site","Moving the database, files, and pod \u2014 this may take a few minutes...");try{await k.post(`/sites/${t}/rename`,{name:y},18e5),E(),d.success(`Site renamed to '${y}'`),S.go("site-detail",{id:t})}catch(L){E(),d.error(L.message)}}}),document.getElementById("sd-site-nav")?.addEventListener("change",y=>{S.go("site-detail",{id:y.target.value})}),Xe(e),Je(e,s),ae(e),oa(e,t),ya(e,t,ne.signal),Ft(t,s),m){if(Hi(e,t),Ct(e,t,ne.signal),Di(t),wt(e,t,a.SiteType),xt(t,a.SiteType),Et(e,t),Ce(t),Ta(e,t,s),g){let y=e.querySelector("#kp-site-switcher"),L=e.querySelector('a[data-switcher="managers"]'),w=e.querySelector("#managers-panel");y&&L&&w&&(L.dataset.switcher=String([...y.children].findIndex(T=>T.contains(w)))),Rt(e,t),At(e,t)}return}document.getElementById("sd-recreate").addEventListener("click",async()=>{_("Recreating Pod","Recreating containers for this site...");try{await k.post(`/sites/${t}/recreate`,{prune:!0}),E(),d.success("Pod recreated"),S.go("site-detail",{id:t})}catch(y){E(),d.error(y.message)}}),document.getElementById("sd-clone")?.addEventListener("click",async()=>{let y=await bs(a.Name);if(y){_("Cloning Site","Copying files and database \u2014 this may take a few minutes...");try{await k.post(`/sites/${t}/clone`,y,6e5),E(),d.success(`Site cloned as '${y.name}'`),S.go("sites")}catch(L){E(),d.error(L.message)}}}),Ct(e,t,ne.signal),pa(e,t),a.SiteType===1&&xa(e,t),ma(e,t,a,c),Fs(e,t),he(e,t),b&&(Ks(e,t),Ye(e,t)),fa(e,t),ha(t);let v=e.querySelector("#kp-site-switcher"),x=e.querySelector('a[data-switcher="files"]');if(v&&x&&(x.dataset.switcher=String(v.children.length-1)),ia(e,t),F(t),p){let y=e.querySelector("#sd-smtp-tab"),L=e.querySelector("#smtp-panel");y.dataset.switcher=String([...v.children].findIndex(w=>w.contains(L))),va(L,y,t)}if(h){let y=e.querySelector('a[data-switcher="database"]'),L=e.querySelector("#dbtools-panel");v&&y&&L&&(y.dataset.switcher=String([...v.children].findIndex(w=>w.contains(L)))),Zs(e,t),Qs(e,s)}if(a.SiteType===1){let y=e.querySelector('a[data-switcher="wordpress"]'),L=e.querySelector("#wpupdates-panel");v&&y&&L&&(y.dataset.switcher=String([...v.children].findIndex(w=>w.contains(L)))),La(e,t),Wt(e,t)}if(g){let y=e.querySelector('a[data-switcher="managers"]'),L=e.querySelector("#managers-panel");v&&y&&L&&(y.dataset.switcher=String([...v.children].findIndex(w=>w.contains(L)))),Rt(e,t),At(e,t)}Fi(e,t),wt(e,t,a.SiteType),xt(t,a.SiteType),Ta(e,t,s),Et(e,t),Ce(t),ca(n??[])}var ms=jn(In());async function pt(e){let t=document.getElementById("totp-qr-img"),s=document.getElementById("totp-qr-wrap");if(!t||!s)return;if(s.querySelectorAll(".totp-uri-text").forEach(n=>n.remove()),typeof ms.default<"u")try{let n=await new Promise((i,o)=>{ms.default.toDataURL(e,{width:220,margin:2},(r,l)=>{r?o(r):i(l)})});t.src=n,t.style.display="";return}catch{}let a=document.createElement("p");a.className="totp-uri-text kp-muted uk-text-small",a.style.wordBreak="break-all",a.textContent=e,s.appendChild(a)}function mt(e){document.getElementById("kp-backup-codes-modal")?.remove();let s=`
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
        </div>`;document.body.insertAdjacentHTML("beforeend",s);let a=UIkit.modal("#kp-backup-codes-modal");a.show(),document.getElementById("kp-backup-copy-btn").addEventListener("click",()=>{let n=e.join(`
`),i=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(n).then(()=>{i.textContent="Copied!"});else{let o=document.createElement("textarea");o.value=n,o.style.cssText="position:fixed;opacity:0",document.body.appendChild(o),o.select();try{document.execCommand("copy"),i.textContent="Copied!"}catch{}o.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{a.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),S.go("users")})}function Bn(e){document.body.insertAdjacentHTML("beforeend",`
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
                            <input class="uk-input kp-input" name="phone" type="tel" required>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label uk-margin-small-bottom">Notifications</label>
                            <div class="uk-flex" style="gap:24px">
                                <label><input class="uk-checkbox" type="checkbox" name="notify_email"> &nbsp;Email</label>
                                <label><input class="uk-checkbox" type="checkbox" name="notify_sms"> &nbsp;SMS</label>
                            </div>
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
        </div>`);let s=UIkit.modal("#kp-create-user-modal");s.show(),document.getElementById("create-user-form").addEventListener("submit",async a=>{a.preventDefault();let n=a.target.querySelector('[type="submit"]'),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let o=new FormData(a.target),r={fname:o.get("fname").trim(),lname:o.get("lname").trim(),uname:o.get("uname").trim(),email:o.get("email").trim(),phone:o.get("phone").trim(),password:o.get("password"),role:parseInt(o.get("role")),notify_email:o.get("notify_email")==="on",notify_sms:o.get("notify_sms")==="on"};try{let l=te(await k.post("/users",r));document.getElementById("users-grid").insertAdjacentHTML("beforeend",kt(l)),d.success(`User '${l.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",Ro(l.id,s)}catch(l){d.error(l.message),n.disabled=!1,n.innerHTML=i}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function Ro(e,t){let s=()=>{t.hide(),document.getElementById("kp-create-user-modal")?.remove(),S.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",s),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let a=document.getElementById("cu-totp-setup-btn");a.disabled=!0,a.textContent="Setting up\u2026";try{let n=await k.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=n.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await pt(n.uri)}catch(n){d.error(n.message),a.disabled=!1,a.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let a=document.getElementById("totp-confirm-code").value.trim();if(a.length!==6){d.error("Enter a 6-digit code");return}let n=document.getElementById("cu-totp-confirm-btn");n.disabled=!0;try{let i=await k.post(`/users/${e}/totp/confirm`,{code:a});t.hide(),document.getElementById("kp-create-user-modal")?.remove(),d.success("TOTP enabled"),i.backup_codes?.length?mt(i.backup_codes):S.go("users")}catch(i){d.error(i.message),n.disabled=!1}})}async function qn(e,t){document.getElementById("kp-edit-user-modal")?.remove();let s;try{s=te(await k.get(`/users/${t}`))}catch(p){d.error(p.message);return}let a=window.KP?.user?.role===99,n=Number(t)===Number(window.KP?.user?.id),i=s.node_uid>0,o=`
        <div id="kp-edit-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit User \u2014 ${s.uname}</h3>
                ${i?'<p class="kp-muted uk-text-small uk-margin-small-top">Synced from the parent node \u2014 changes here are overwritten the next time this user signs in from the parent.</p>':""}
                <form id="edit-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        ${a?`
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" value="${f(s.uname)}" autocomplete="off">
                        </div>`:""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" value="${f(s.fname)}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" value="${f(s.lname)}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" value="${f(s.email)}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel" value="${f(s.phone||"")}" required>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label uk-margin-small-bottom">Notifications</label>
                            <div class="uk-flex" style="gap:24px">
                                <label><input class="uk-checkbox" type="checkbox" name="notify_email" ${s.notify_email?"checked":""}> &nbsp;Email</label>
                                <label><input class="uk-checkbox" type="checkbox" name="notify_sms" ${s.notify_sms?"checked":""}> &nbsp;SMS</label>
                            </div>
                        </div>
                        ${a?`
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Role</label>
                            <select class="uk-select kp-select" name="role">
                                <option value="50" ${s.role===50?"selected":""}>Manager</option>
                                <option value="99" ${s.role===99?"selected":""}>Admin</option>
                            </select>
                        </div>`:""}
                        ${i?"":`
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">New Password</label>
                            <input class="uk-input kp-input" name="password" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" uk-tooltip="leave blank to keep">
                        </div>`}
                        ${n&&!i?`
                        <div class="uk-margin" id="edit-user-current-pw">
                            <label class="uk-form-label">Current Password</label>
                            <input class="uk-input kp-input" name="current_password" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" uk-tooltip="required when changing your own password">
                        </div>`:""}                      
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Save Changes</button>
                    </div>
                </form>
                
                ${a&&s.role===50?`
                <hr class="uk-divider-muted uk-margin-top">

                <div id="edit-user-sites">
                    <h4 class="uk-margin-small-bottom kp-view-title">Assigned Sites</h4>
                    <div id="edit-user-sites-list"><div uk-spinner="ratio: 0.6"></div></div>
                </div>`:""}

                <hr class="uk-divider-muted uk-margin-top" ${i?'style="display:none"':""}>

                <div id="totp-section" ${i?'style="display:none"':""}>
                    <h4 class="uk-margin-small-bottom kp-view-title">Two-Factor Authentication</h4>
                    ${s.totp_enabled?`<div class="uk-flex uk-flex-middle" style="gap:12px">
                            <span class="kp-badge kp-badge-admin" style="font-size:0.75rem">Enabled</span>
                            <button id="totp-disable-btn" class="uk-button kp-btn-secondary kp-btn-sm">Disable TOTP</button>
                           </div>
                           ${n?`<div class="uk-flex uk-margin-small-top" style="gap:8px">
                            <input class="uk-input kp-input" id="totp-disable-password" type="password" placeholder="Current password">
                            <input class="uk-input kp-input" id="totp-disable-code" type="text" inputmode="numeric" placeholder="TOTP or backup code">
                           </div>`:""}`:`<div class="uk-flex uk-flex-middle" style="gap:12px">
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
        </div>`;document.body.insertAdjacentHTML("beforeend",o);let r=UIkit.modal("#kp-edit-user-modal");r.show(),document.getElementById("edit-user-form").addEventListener("submit",async p=>{p.preventDefault();let m=p.target.querySelector('[type="submit"]'),b=m.innerHTML;m.disabled=!0,m.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let h=new FormData(p.target),g={fname:h.get("fname").trim(),lname:h.get("lname").trim(),email:h.get("email").trim(),phone:h.get("phone").trim(),notify_email:h.get("notify_email")==="on",notify_sms:h.get("notify_sms")==="on"};if(a){g.role=parseInt(h.get("role"));let x=h.get("uname");x&&(g.uname=x.trim())}let v=h.get("password");v&&(g.password=v),v&&n&&(g.current_password=h.get("current_password"));try{await k.put(`/users/${t}`,g),r.hide(),document.getElementById("kp-edit-user-modal")?.remove(),d.success("User updated"),S.go("users")}catch(x){d.error(x.message),m.disabled=!1,m.innerHTML=b}});let l=document.getElementById("totp-setup-btn");l&&l.addEventListener("click",async()=>{l.disabled=!0,l.textContent="Setting up\u2026";try{let p=await k.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=p.secret,document.getElementById("totp-setup-area").style.display="",await pt(p.uri)}catch(p){d.error(p.message),l.disabled=!1,l.textContent="Enable TOTP"}});let c=document.getElementById("totp-confirm-btn");c&&c.addEventListener("click",async()=>{let p=document.getElementById("totp-confirm-code").value.trim();if(p.length!==6){d.error("Enter a 6-digit code");return}c.disabled=!0;try{let m=await k.post(`/users/${t}/totp/confirm`,{code:p});r.hide(),document.getElementById("kp-edit-user-modal")?.remove(),d.success("TOTP enabled"),m.backup_codes?.length?mt(m.backup_codes):S.go("users")}catch(m){d.error(m.message),c.disabled=!1}});let u=document.getElementById("totp-disable-btn");if(u&&u.addEventListener("click",async()=>{u.disabled=!0;try{await k.delete(`/users/${t}/totp`,n?{current_password:document.getElementById("totp-disable-password").value,code:document.getElementById("totp-disable-code").value.trim()}:void 0),d.success("TOTP disabled"),r.hide(),document.getElementById("kp-edit-user-modal")?.remove(),S.go("users")}catch(p){d.error(p.message),u.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove()),a&&s.role===50){let p=document.getElementById("edit-user-sites-list");try{let m=await k.get(`/users/${t}/sites`);p.innerHTML=m?.length?`<ul class="uk-list uk-list-collapse uk-margin-remove">${m.map(b=>`<li>${f(b.name)}</li>`).join("")}</ul>`:'<p class="kp-muted uk-text-small uk-margin-remove">No sites assigned.</p>'}catch(m){p.innerHTML="",d.error(m.message)}}}async function Mn(e){if(!H()){e.innerHTML=D("Access denied");return}let t=await k.get("/users");e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Users</h1>
            <button class="uk-button kp-btn-primary" id="users-new-btn">
                <span uk-icon="plus"></span> New User
            </button>
        </div>
        <div class="kp-list-grid" id="users-grid">
            ${t.map(s=>kt(te(s))).join("")}
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>Bn(e)),Do(e)}function kt(e){let t=e.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>',s=[e.notify_email?'<span uk-icon="icon: mail; ratio: 0.85" uk-tooltip="Email notifications on" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: mail; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="Email notifications off"></span>',e.notify_sms?'<span uk-icon="icon: receiver; ratio: 0.85" uk-tooltip="SMS notifications on" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: receiver; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="SMS notifications off"></span>'].join(" "),a=`${e.fname?.[0]??""}${e.lname?.[0]??""}`.toUpperCase();return`<div class="kp-list-card" data-user-id="${e.id}">
        <!-- avatar + full name -->
        <div class="kp-list-card-header">
            <span class="kp-list-card-avatar">${f(a)}</span>
            <span class="kp-list-card-title">${f(e.fname)} ${f(e.lname)}</span>
        </div>

        <!-- details -->
        <div class="kp-list-card-body">
            ${N("Username",f(e.uname),"kp-mono")}
            ${N("Email",f(e.email))}
            ${N("Role",`${t}${e.node_uid>0?' <span class="kp-badge kp-badge-manager" uk-tooltip="Synced from the parent node">Synced</span>':""}${e.blocked?' <span class="kp-status kp-status-error">Blocked</span>':""}`,"kp-list-card-value-wrap")}
            ${N("2FA",e.totp_enabled?'<span uk-icon="icon: check; ratio: 0.9" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: close; ratio: 0.9" style="color:var(--kp-text-dim)"></span>')}
            ${N("Notify",s)}
            ${N("Created",f(e.created),"kp-muted kp-mono")}
        </div>

        <!-- action buttons -->
        <div class="kp-list-card-actions">
            <span class="kp-list-card-spacer"></span>
            ${e.node_uid>0&&e.id!==window.KP.user.id?`
            <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="toggle-block-user" data-uid="${e.id}" data-blocked="${e.blocked?1:0}" uk-tooltip="${e.blocked?"Unblock":"Block"} the User">
                <span uk-icon="icon: ${e.blocked?"unlock":"lock"};"></span>
            </button>`:""}
            <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit-user" data-uid="${e.id}" title="Edit" uk-tooltip="Edit the User">
                <span uk-icon="icon: pencil;"></span>
            </button>
            <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="delete-user" data-uid="${e.id}" title="Delete" uk-tooltip="Delete the User">
                <span uk-icon="icon: trash;"></span>
            </button>
        </div>
    </div>`}function Do(e){e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="delete-user"]');if(!(!s||!await P("Delete User","Delete this user? This cannot be undone.")))try{await k.delete(`/users/${s.dataset.uid}`),s.closest(".kp-list-card").remove(),d.success("User deleted")}catch(n){d.error(n.message)}}),e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="edit-user"]');s&&qn(e,s.dataset.uid)}),e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="toggle-block-user"]');if(!s)return;let a=s.dataset.blocked!=="1";if(await P(a?"Block User":"Unblock User",a?"Block this synced user? They are signed out here and can no longer sign in to this node from the parent.":"Unblock this synced user?"))try{await k.put(`/users/${s.dataset.uid}/blocked`,{blocked:a});let i=te(await k.get(`/users/${s.dataset.uid}`));s.closest(".kp-list-card").outerHTML=kt(i),d.success(a?"User blocked":"User unblocked")}catch(i){d.error(i.message)}})}async function An(e,t={}){if(!H()){e.innerHTML=D("Access denied");return}e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global WAF</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global WAF settings apply to all sites. Per-site overrides are set on each site's WAF tab.
        </p>

        <!-- tab pills -->
        <ul class="kp-tab-pills" id="kp-waf-pills">
            <li data-tab="crs"><a href="#"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> Core Rule Set</a></li>
            <li data-tab="autoban"><a href="#"><span uk-icon="icon: ban; ratio: 0.85"></span> Auto-Ban</a></li>
        </ul>

        <!-- switcher panels -->
        <ul class="uk-switcher uk-margin-large-bottom" id="kp-waf-switcher">

            <!-- core rule set -->
            <li>
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
            </li>

            <!-- auto-ban -->
            <li>${Ze()}</li>

        </ul>`,Ho(e),Ut(e,t.tab),Rn(e),et(e)}async function Rn(e){try{let t=await k.get("/settings/waf");if(!e.querySelector("#sec-waf-enabled"))return;e.querySelector("#sec-waf-enabled").checked=!!t.Enabled,e.querySelector("#sec-waf-audit").checked=!!t.AuditLog,e.querySelector("#sec-waf-mode").value=String(t.Mode??0),e.querySelector("#sec-waf-paranoia").value=String(t.ParanoiaLevel??1),e.querySelector("#sec-waf-exclusions").value=t.Exclusions??""}catch(t){d.error("Failed to load WAF settings: "+t.message)}}function Ho(e){e.querySelector("#sec-waf-save")?.addEventListener("click",async()=>{let t=e.querySelector("#sec-waf-save"),s=t.innerHTML;t.disabled=!0,t.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put("/settings/waf",{enabled:e.querySelector("#sec-waf-enabled").checked,mode:parseInt(e.querySelector("#sec-waf-mode").value,10),paranoia_level:parseInt(e.querySelector("#sec-waf-paranoia").value,10),audit_log:e.querySelector("#sec-waf-audit").checked,exclusions:e.querySelector("#sec-waf-exclusions").value.trim()}),d.success("WAF settings saved \u2014 engine recompiling in background")}catch(a){d.error(a.message)}finally{t.disabled=!1,t.innerHTML=s}}),e.querySelector("#sec-waf-import")?.addEventListener("change",async t=>{let s=t.target.files[0];if(!s)return;let a=new FormData;a.append("file",s);try{let n=await fetch("/api/settings/waf/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:a}),i=n.status===204?null:await n.json().catch(()=>null);if(!n.ok)throw new Error(i?.error||`HTTP ${n.status}`);await Rn(e),d.success("WAF settings imported")}catch(n){d.error(n.message)}finally{t.target.value=""}})}S.register("dashboard",e=>Is(e));window.KP?.user?.role===99&&(S.register("disaster-recovery",gt),ft(),setInterval(ft,3e4));S.register("sites",e=>Cs(e));S.register("site-detail",(e,t)=>_a(e,t));S.register("users",e=>Mn(e));S.register("nodes",e=>se(e));S.register("settings",(e,t)=>St(e,t));S.register("security",(e,t)=>qs(e,t));S.register("waf",(e,t)=>An(e,t));S.register("admin-logs",e=>gs(e));S.register("audit-log",e=>xs(e));document.addEventListener("keydown",e=>{let t=e.target;t?.matches?.("input, textarea, select, [contenteditable='true']")&&(t.closest?.(".CodeMirror")||t.id==="wpcli-input"&&(e.key==="ArrowUp"||e.key==="ArrowDown")||["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"," "].includes(e.key)&&e.stopPropagation())},!0);document.addEventListener("click",e=>{let t=e.target.closest("[data-view]");t&&(e.preventDefault(),S.go(t.dataset.view))});document.addEventListener("click",async e=>{let t=e.target.closest("[data-action]");if(!t)return;e.stopPropagation();let{action:s,id:a}=t.dataset;switch(s){case"manage":S.go("site-detail",{id:a});break;case"start":await bt(a,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await bt(a,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await bt(a,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await bt(a,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"delete":await No(a);break;case"recreate":_("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await k.post(`/sites/${a}/recreate`,{prune:!0}),E(),d.success("Pod recreated"),S.go("sites")}catch(n){E(),d.error(n.message)}break}});document.addEventListener("kp:bulk-action",async e=>{let{action:t,ids:s}=e.detail;if(!s.length)return;let a={start:"Starting",stop:"Stopping",restart:"Restarting",flush:"Flushing Caches",recreate:"Recreating"},n=t==="recreate"?"Please hold while we update your Pods":"Please wait...",i=t==="recreate"?{prune:!0}:void 0,o=t==="recreate"?1200*1e3:void 0;_(`${a[t]} ${s.length} Site${s.length!==1?"s":""}`,n);let r=await Promise.allSettled(s.map(c=>k.post(`/sites/${c}/${t}`,i,o)));E();let l=r.filter(c=>c.status==="rejected").length;l===0?d.success(`${t.charAt(0).toUpperCase()+t.slice(1)} complete for ${s.length} site${s.length!==1?"s":""}`):d.error(`${l} of ${s.length} sites failed \u2014 check logs`),["start","stop","restart","recreate"].includes(t)&&S.go("sites")});async function bt(e,t,s,a){_(s,a);try{if(await k.post(`/sites/${e}/${t}`),E(),d.success(s+" complete"),t!=="flush"){let{view:n,params:i}=Fe();S.go(n,i)}}catch(n){E(),d.error(n.message)}}async function No(e){if(!await P("Delete Site",`This will stop and permanently remove the pod and all its data. Are you sure?

A final backup will be created before deletion. This may take a moment.`))return;_("Deleting Site","Creating final backup and removing the pod \u2014 please wait...");let s;try{s=await fetch(`/api/sites/${e}`,{method:"DELETE",headers:{"X-CSRF-Token":window.KP?.csrf??""}})}catch{}if(E(),s?.status===409){let i=await s.json().catch(()=>null);d.error(i?.error||"Site is busy \u2014 try again when its current job finishes");return}if(s?.ok&&s.headers.get("Content-Type")?.includes("gzip")){let o=(s.headers.get("Content-Disposition")??"").match(/filename="([^"]+)"/)?.[1]??`${e}_final.tar.gz`,r=await s.blob(),l=document.createElement("a");l.href=URL.createObjectURL(r),l.download=o,l.click(),URL.revokeObjectURL(l.href),d.success("Site deleted. Final backup downloaded."),S.go("sites");return}let a=!1,n=0;for(;!a&&n<10;){try{await new Promise(o=>setTimeout(o,2e3)),a=!(await k.get("/sites")).find(o=>o.ID===parseInt(e))}catch{}n++}a?(d.success("Site deleted. Final backup saved to S3."),S.go("sites")):d.error("Delete failed - site still exists after 20s")}if(window.KP?.user?.role===99){let e=document.getElementById("kp-resource-warning"),t=document.getElementById("kp-resource-warning-msg"),s=async()=>{try{let a=await k.get("/settings/resource-warning");a?.active&&e&&t?(t.textContent=`${a.current_mb}MB used, threshold ${a.threshold_mb}MB \u2014 throttling ${a.offender}.`,e.style.display=""):e&&(e.style.display="none")}catch{}};s(),setInterval(s,3e4)}window.addEventListener("hashchange",()=>{if(S._ownHashChange)return;let{view:e,params:t}=Fe();S.go(e,t)});(()=>{let e=document.getElementById("kp-totop");if(!e)return;let t=()=>{e.classList.toggle("is-visible",window.scrollY>150)};window.addEventListener("scroll",t,{passive:!0}),t(),e.addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"})})})();(()=>{let e=document.querySelectorAll(".kp-logout-link");e.length&&e.forEach(t=>{t.addEventListener("click",async s=>{s.preventDefault(),await fetch("/logout",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""}}),window.location.href="/login"})})})();(()=>{let e=document.querySelectorAll(".kp-panel-update-btn");e.length&&e.forEach(t=>{t.addEventListener("click",async s=>{if(s.preventDefault(),!!await P("Update PodNest","PodNest will update and restart, and the panel will be unavailable for a minute or two. Continue?"))try{await k.post("/settings/panel-update"),e.forEach(a=>{a.disabled=!0}),d.success("The update has been queued, please wait a minute or 2 and refresh")}catch(a){d.error(a.message)}})})})();(()=>{let e=document.getElementById("kp-bn-more"),t=document.getElementById("kp-bn-more-menu"),s=document.getElementById("kp-bn-backdrop");if(!e||!t||!s)return;let a=n=>{t.hidden=!n,s.hidden=!n,e.classList.toggle("kp-bn-open",n)};e.addEventListener("click",()=>a(t.hidden)),s.addEventListener("click",()=>a(!1)),t.addEventListener("click",n=>{n.target.closest("[data-view]")&&a(!1)})})();(()=>{let e=document.querySelectorAll(".kp-pair-code-link");e.length&&e.forEach(t=>{t.addEventListener("click",async s=>{s.preventDefault();try{Uo(await k.post("/nodes/pair-code"))}catch(a){d.error(a.message)}})})})();function Uo({code:e,url:t,expires_in:s}){let a="kp-pair-code-modal";document.getElementById(a)?.remove();let n=`
        <div id="${a}" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                <h3 class="uk-modal-title">Pairing Code</h3>
                <p class="kp-muted uk-text-small">
                    On the parent node, choose Add Node and enter this URL and code.
                    The code works once, and only for this URL.
                </p>
                <label class="kp-label">URL</label>
                <input class="uk-input kp-input" type="text" readonly value="${f(t)}">
                <label class="kp-label uk-margin-small-top">Code</label>
                <input class="uk-input kp-input" type="text" readonly value="${f(e)}"
                    style="letter-spacing:0.2em;font-size:1.2rem;text-align:center">
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    Expires in <span id="kp-pair-code-ttl"></span>
                </p>
                <div class="uk-flex uk-flex-right uk-margin-top">
                    <button class="uk-button kp-btn-ghost uk-modal-close">Close</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",n);let i=document.getElementById(a),o=document.getElementById("kp-pair-code-ttl"),r=s,l=()=>{if(r<=0){o.textContent="\u2014 expired",clearInterval(c);return}o.textContent=`${Math.floor(r/60)}:${String(r%60).padStart(2,"0")}`,r--},c=setInterval(l,1e3);l(),i.addEventListener("hidden",()=>{clearInterval(c),setTimeout(()=>i.remove(),300)},{once:!0}),UIkit.modal(i).show()}var{view:Fo,params:Wo}=Fe();S.go(Fo,Wo);})();
