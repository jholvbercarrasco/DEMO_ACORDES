const ROOTS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SONG_KEYS=ROOTS.flatMap(k=>[k,k+'m']);
const PAD_FILES={C:'assets/pads/C.mp3','C#':'assets/pads/Cs.mp3',D:'assets/pads/D.mp3','D#':'assets/pads/Ds.mp3',E:'assets/pads/E.mp3',F:'assets/pads/F.mp3','F#':'assets/pads/Fs.mp3',G:'assets/pads/G.mp3','G#':'assets/pads/Gs.mp3',A:'assets/pads/A.mp3','A#':'assets/pads/As.mp3',B:'assets/pads/B.mp3',Am:'assets/pads/Am.mp3',Cm:'assets/pads/Cm.mp3',Dm:'assets/pads/Dm.mp3',Fm:'assets/pads/Fm.mp3',Gm:'assets/pads/Gm.mp3',
'C#m':'assets/pads/E.mp3','D#m':'assets/pads/Fs.mp3',Em:'assets/pads/G.mp3','F#m':'assets/pads/A.mp3','G#m':'assets/pads/B.mp3','A#m':'assets/pads/Cs.mp3',Bm:'assets/pads/D.mp3'};
const STORAGE_KEY='cifrapad-demo-v1';
const SECTION_TYPES=['Intro','Estrofa','Pre-coro','Coro','Puente','Instrumental','Interludio','Final','Otro'];

const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const deep=x=>JSON.parse(JSON.stringify(x));

const seedSong={
  id:uid(), title:'Canción demo', artist:'CifraPad', key:'D', bpm:72, meter:'4/4', transpose:0, fontSize:18,
  sections:[
    {id:uid(),type:'Intro',title:'Intro',content:'D    A    Bm    G'},
    {id:uid(),type:'Estrofa',title:'Estrofa 1',content:'D\nAquí comienza una canción de prueba\nA\ny el cifrado queda encima de la letra\nBm\nPuedes editar cada parte libremente\nG\ny preparar tu versión para tocar'},
    {id:uid(),type:'Coro',title:'Coro',content:'G              D\nEste es el coro de demostración\nA                 Bm\ncon acordes listos para transponer\nG                 D\nordena la estructura como prefieras\nA\ny deja que el pad acompañe'},
    {id:uid(),type:'Puente',title:'Puente',content:'Bm    G\nPuente instrumental\nD     A\nRepite x2 si deseas'}
  ], originalOrder:[], arrangement:[]
};
seedSong.originalOrder=seedSong.sections.map(s=>s.id); seedSong.arrangement=[...seedSong.originalOrder];

let state=loadState(); state.prefs=state.prefs||{};
let currentSongId=null; let editingSong=null; let editorFocusTextarea=null; let stageSongIds=[]; let stageIndex=0;
let autoScrollRAF=null, autoScrollLast=0, autoScrollRunning=false;

function loadState(){
  try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(x?.songs) return x;}catch(e){}
  return {songs:[seedSong],setlists:[{id:uid(),name:'Domingo',songs:[seedSong.id]}],prefs:{}};
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.add('hidden'),2200)}
function escapeHTML(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function initSelects(){
  ['#keyFilter','#songKeyInput','#padKeySelect','#stagePadKey'].forEach(sel=>{
    const el=$(sel); if(!el)return; const preserve=el.id==='keyFilter';
    if(preserve) el.innerHTML='<option value="">Todos los tonos</option>'; else el.innerHTML='';
    SONG_KEYS.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=k;el.appendChild(o)});
  });
}

function renderLibrary(){
  const q=$('#searchInput').value.trim().toLowerCase(), k=$('#keyFilter').value;
  const songs=state.songs.filter(s=>(!q||`${s.title} ${s.artist} ${s.key}`.toLowerCase().includes(q))&&(!k||effectiveKey(s)===k));
  $('#songGrid').innerHTML=songs.map(s=>`<article class="song-card" data-song="${s.id}">
    <div class="song-card-top"><div class="key-pill">${effectiveKey(s)}</div><button class="icon-btn mini more-song" title="Editar" data-edit="${s.id}">⋯</button></div>
    <h3>${escapeHTML(s.title)}</h3><p>${escapeHTML(s.artist||'Sin artista')}</p>
    <div class="song-card-meta"><span>${s.bpm||'—'} BPM</span><span>${escapeHTML(s.meter||'4/4')}</span><span>${s.sections?.length||0} secciones</span></div>
    <div class="song-card-actions"><button class="ghost open-song" data-open="${s.id}">Abrir</button><button class="ghost add-list" data-add-list="${s.id}">＋ Lista</button><button class="primary play-song" data-stage="${s.id}">▶ Tocar</button></div>
  </article>`).join('');
  $('#emptyLibrary').classList.toggle('hidden',songs.length>0);
  $$('.open-song').forEach(b=>b.onclick=()=>openSong(b.dataset.open));
  $$('.play-song').forEach(b=>b.onclick=()=>openStage(b.dataset.stage));
  $$('.add-list').forEach(b=>b.onclick=()=>addSongToSetlist(b.dataset.addList));
  $$('.more-song').forEach(b=>b.onclick=()=>openEditor(b.dataset.edit));
}

function renderSetlists(){
  $('#setlistGrid').innerHTML=state.setlists.map(sl=>`<article class="setlist-card"><h3>${escapeHTML(sl.name)}</h3><p>${sl.songs.length} canciones</p>
  <div class="setlist-songs">${sl.songs.map(id=>{const s=state.songs.find(x=>x.id===id);return s?`<div class="setlist-song"><span>${escapeHTML(s.title)}</span><b>${effectiveKey(s)}</b></div>`:''}).join('')}</div>
  <button class="primary play-setlist" data-setlist="${sl.id}">▶ Tocar setlist</button></article>`).join('');
  $$('.play-setlist').forEach(b=>b.onclick=()=>{const sl=state.setlists.find(x=>x.id===b.dataset.setlist);if(sl?.songs.length)openStage(sl.songs[0],sl.songs)});
}


function addSongToSetlist(songId){
  if(!state.setlists.length){const n=prompt('No tienes setlists. Nombre del nuevo setlist:');if(!n)return;state.setlists.push({id:uid(),name:n,songs:[]})}
  const menu=state.setlists.map((s,i)=>`${i+1}. ${s.name}`).join('\n');
  const ans=prompt(`Agregar a cuál setlist?\n${menu}`,'1'); const idx=(+ans)-1;if(idx<0||!state.setlists[idx])return;
  if(!state.setlists[idx].songs.includes(songId))state.setlists[idx].songs.push(songId);saveState();renderSetlists();toast('Agregada a '+state.setlists[idx].name)
}

function switchView(v){$$('.view').forEach(x=>x.classList.remove('active'));$$('.nav-btn').forEach(x=>x.classList.remove('active'));$(`#${v}View`).classList.add('active');$(`.nav-btn[data-view="${v}"]`).classList.add('active');$('#pageTitle').textContent=v==='library'?'Mi biblioteca':'Mis setlists';}

function splitSongKey(key){const m=String(key||'C').match(/^([A-G](?:#|b)?)(m?)$/);return m?{root:transposeRoot(m[1],0),minor:m[2]==='m'}:{root:'C',minor:false}}
function effectiveKey(s){const k=splitSongKey(s.key),i=ROOTS.indexOf(k.root),root=ROOTS[(i+((s.transpose||0)%12)+12)%12];return root+(k.minor?'m':'')}
function transposeRoot(root,delta){const flats={'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#'};const n=flats[root]||root;const i=ROOTS.indexOf(n);return i<0?root:ROOTS[(i+delta+120)%12]}
function transposeText(text,delta){
  if(!delta)return text;
  return text.replace(/(^|[^A-Za-z])([A-G](?:#|b)?)(?=($|[^A-Za-z]))/g,(m,p,r)=>p+transposeRoot(r,delta));
}
function isChordLine(line){
  const t=line.trim(); if(!t)return false;
  const tokens=t.split(/\s+/).filter(Boolean); if(!tokens.length)return false;
  const rx=/^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\([^)]*\))?(?:\/[A-G](?:#|b)?)?[.,-]?$/i;
  return tokens.every(x=>rx.test(x)) && tokens.length<=16;
}
function contentHTML(content,delta){return transposeText(content,delta).split('\n').map(line=>`<div class="${isChordLine(line)?'chord-line':''}">${escapeHTML(line)||'&nbsp;'}</div>`).join('')}
function orderedSections(song){const map=new Map(song.sections.map(s=>[s.id,s]));return (song.arrangement?.length?song.arrangement:song.originalOrder||[]).map(id=>map.get(id)).filter(Boolean)}

function openSong(id){
  const s=state.songs.find(x=>x.id===id); if(!s)return; currentSongId=id;
  $('#panelSongTitle').textContent=s.title;$('#readerKey').textContent=effectiveKey(s);$('#readerBpm').textContent=s.bpm||'—';$('#readerMeter').textContent=s.meter||'4/4';
  $('#padKeySelect').value=effectiveKey(s);document.documentElement.style.setProperty('--reader-size',`${s.fontSize||18}px`);
  renderReader(s); showPanel('songPanel'); syncPadKey(effectiveKey(s));
}
function renderReader(s){$('#readerSections').innerHTML=orderedSections(s).map(sec=>`<section class="reader-section"><div class="section-label">${escapeHTML(sec.title||sec.type)}</div><div class="section-text">${contentHTML(sec.content,s.transpose||0)}</div></section>`).join('')}

function showPanel(id){$('#'+id).classList.remove('hidden')}
function hidePanel(id){$('#'+id).classList.add('hidden')}

function openEditor(id=null, imported=null){
  let base=id?state.songs.find(x=>x.id===id):null;
  editingSong=deep(base||imported||{id:uid(),title:'',artist:'',key:'C',bpm:72,meter:'4/4',transpose:0,fontSize:18,sections:[],originalOrder:[],arrangement:[]});
  if(!editingSong.sections.length) addEditorSection('Estrofa',false);
  $('#editorHeading').textContent=base?'Editar canción':imported?'Revisar importación':'Nueva canción';
  $('#songTitleInput').value=editingSong.title||'';$('#songArtistInput').value=editingSong.artist||'';$('#songKeyInput').value=editingSong.key||'C';$('#songBpmInput').value=editingSong.bpm||72;$('#songMeterInput').value=editingSong.meter||'4/4';
  renderChordPalette();renderSectionEditors();renderArrangement();activateEditorTab('content');hidePanel('importPanel');showPanel('editorPanel');
}
function renderChordPalette(){
  const sk=splitSongKey($('#songKeyInput').value||editingSong.key||'C'); const i=ROOTS.indexOf(sk.root); const offsets=sk.minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
  const suffixes=sk.minor?['m','dim','','m','m','','']:['','m','m','','','m','dim'];
  const labels=offsets.map((o,n)=>ROOTS[(i+o)%12]+suffixes[n]);
  $('#chordPalette').innerHTML=labels.map(c=>`<button data-chord="${c}">${c}</button>`).join('');
  $$('#chordPalette button').forEach(b=>b.onclick=()=>insertChord(b.dataset.chord));
}
function insertChord(ch){if(!editorFocusTextarea){toast('Haz clic primero dentro de una sección');return} const el=editorFocusTextarea;const a=el.selectionStart,b=el.selectionEnd;el.value=el.value.slice(0,a)+ch+el.value.slice(b);el.focus();el.selectionStart=el.selectionEnd=a+ch.length;el.dispatchEvent(new Event('input'));}
function addEditorSection(type,rerender=true){
  const same=editingSong.sections.filter(s=>s.type===type).length;const title=(type==='Estrofa'&&same)?`Estrofa ${same+1}`:(type==='Coro'&&same)?`Coro ${same+1}`:type;
  const sec={id:uid(),type,title,content:''};editingSong.sections.push(sec);editingSong.originalOrder.push(sec.id);editingSong.arrangement.push(sec.id);if(rerender){renderSectionEditors();renderArrangement()}
}
function renderSectionEditors(){
  $('#sectionEditorList').innerHTML=editingSong.sections.map((s,i)=>`<article class="section-editor-card" data-sec="${s.id}"><div class="section-editor-top">
  <select class="sec-type">${SECTION_TYPES.map(t=>`<option ${t===s.type?'selected':''}>${t}</option>`).join('')}</select>
  <input class="sec-title" value="${escapeHTML(s.title||s.type)}" placeholder="Nombre de sección">
  <div class="section-editor-actions"><button data-up="${s.id}" title="Subir">↑</button><button data-down="${s.id}" title="Bajar">↓</button><button data-del="${s.id}" title="Eliminar">×</button></div></div>
  <textarea class="sec-content" placeholder="Escribe acordes y letra…">${escapeHTML(s.content||'')}</textarea></article>`).join('');
  $$('.section-editor-card').forEach(card=>{const sec=editingSong.sections.find(s=>s.id===card.dataset.sec);const ta=card.querySelector('.sec-content');ta.onfocus=()=>editorFocusTextarea=ta;ta.oninput=()=>sec.content=ta.value;card.querySelector('.sec-title').oninput=e=>{sec.title=e.target.value;renderArrangement()};card.querySelector('.sec-type').onchange=e=>{sec.type=e.target.value;if(!sec.title)sec.title=e.target.value;};});
  $$('[data-up]').forEach(b=>b.onclick=()=>moveSection(b.dataset.up,-1));$$('[data-down]').forEach(b=>b.onclick=()=>moveSection(b.dataset.down,1));$$('[data-del]').forEach(b=>b.onclick=()=>deleteSection(b.dataset.del));
}
function moveSection(id,d){const i=editingSong.sections.findIndex(s=>s.id===id),j=i+d;if(i<0||j<0||j>=editingSong.sections.length)return;[editingSong.sections[i],editingSong.sections[j]]=[editingSong.sections[j],editingSong.sections[i]];editingSong.originalOrder=editingSong.sections.map(s=>s.id);renderSectionEditors();renderArrangement()}
function deleteSection(id){editingSong.sections=editingSong.sections.filter(s=>s.id!==id);editingSong.originalOrder=editingSong.originalOrder.filter(x=>x!==id);editingSong.arrangement=editingSong.arrangement.filter(x=>x!==id);renderSectionEditors();renderArrangement()}
function renderArrangement(){
  const map=new Map(editingSong.sections.map(s=>[s.id,s]));
  $('#arrangementList').innerHTML=editingSong.arrangement.map((id,i)=>{const s=map.get(id);if(!s)return'';return`<div class="arrangement-item"><span class="drag-handle">≡</span><strong>${escapeHTML(s.title||s.type)}</strong><div class="arrangement-actions"><button data-arr-up="${i}">↑</button><button data-arr-down="${i}">↓</button><button data-arr-dup="${i}">⧉</button><button data-arr-del="${i}">×</button></div></div>`}).join('');
  $$('[data-arr-up]').forEach(b=>b.onclick=()=>moveArrangement(+b.dataset.arrUp,-1));$$('[data-arr-down]').forEach(b=>b.onclick=()=>moveArrangement(+b.dataset.arrDown,1));$$('[data-arr-dup]').forEach(b=>b.onclick=()=>{const i=+b.dataset.arrDup;editingSong.arrangement.splice(i+1,0,editingSong.arrangement[i]);renderArrangement()});$$('[data-arr-del]').forEach(b=>b.onclick=()=>{editingSong.arrangement.splice(+b.dataset.arrDel,1);renderArrangement()});
}
function moveArrangement(i,d){const j=i+d;if(j<0||j>=editingSong.arrangement.length)return;[editingSong.arrangement[i],editingSong.arrangement[j]]=[editingSong.arrangement[j],editingSong.arrangement[i]];renderArrangement()}
function activateEditorTab(name){$$('.editor-tab').forEach(x=>x.classList.remove('active'));$$('.tab').forEach(x=>x.classList.remove('active'));$(`#${name}Tab`).classList.add('active');$(`.tab[data-editor-tab="${name}"]`).classList.add('active')}
function saveEditingSong(){
  editingSong.title=$('#songTitleInput').value.trim()||'Sin título';editingSong.artist=$('#songArtistInput').value.trim();editingSong.key=$('#songKeyInput').value;editingSong.bpm=+$('#songBpmInput').value||72;editingSong.meter=$('#songMeterInput').value.trim()||'4/4';
  if(!editingSong.originalOrder?.length)editingSong.originalOrder=editingSong.sections.map(s=>s.id);if(!editingSong.arrangement?.length)editingSong.arrangement=[...editingSong.originalOrder];
  const i=state.songs.findIndex(s=>s.id===editingSong.id);if(i>=0)state.songs[i]=editingSong;else state.songs.unshift(editingSong);saveState();hidePanel('editorPanel');renderLibrary();renderSetlists();toast('Canción guardada');
}

function parseImportedText(raw){
  const lines=raw.replace(/\r/g,'').split('\n'); let title='',artist=''; const sections=[]; let current=null;
  const secRx=/^(intro|introducci[oó]n|estrofa|verso|verse|pre[- ]?coro|pre[- ]?chorus|coro|chorus|puente|bridge|instrumental|interludio|outro|final)(?:\s*\d+)?[:\-]?$/i;
  const makeSec=(label)=>{const clean=label.replace(/[:\-]+$/,'').trim();let type='Otro';const low=clean.toLowerCase();if(/intro/.test(low))type='Intro';else if(/estrofa|verso|verse/.test(low))type='Estrofa';else if(/pre/.test(low))type='Pre-coro';else if(/coro|chorus/.test(low))type='Coro';else if(/puente|bridge/.test(low))type='Puente';else if(/instrumental/.test(low))type='Instrumental';else if(/interludio/.test(low))type='Interludio';else if(/outro|final/.test(low))type='Final';current={id:uid(),type,title:clean||type,content:''};sections.push(current)};
  for(const lineRaw of lines){const line=lineRaw.trimEnd();const trimmed=line.trim();if(!trimmed&& !current)continue;if(secRx.test(trimmed)){makeSec(trimmed);continue}if(!title && trimmed && !isChordLine(trimmed) && trimmed.length<80){title=trimmed;continue}if(!current)makeSec('Estrofa 1');current.content+=(current.content?'\n':'')+line;}
  if(!sections.length)makeSec('Estrofa 1');
  const song={id:uid(),title:title||'Importación sin título',artist,key:detectLikelyKey(sections)||'C',bpm:72,meter:'4/4',transpose:0,fontSize:18,sections,originalOrder:sections.map(s=>s.id),arrangement:sections.map(s=>s.id)};
  return song;
}
function detectLikelyKey(sections){const roots=[];sections.forEach(s=>s.content.split('\n').filter(isChordLine).forEach(l=>l.split(/\s+/).forEach(t=>{const m=t.match(/^([A-G](?:#|b)?)/);if(m)roots.push(transposeRoot(m[1],0))})));return roots[0]||null}
async function importFile(file,type){
  const status=$('#importStatus');status.classList.remove('hidden');status.textContent='Procesando archivo…';
  try{let text='';if(type==='image'){if(!window.Tesseract)throw new Error('OCR no disponible');status.textContent='Leyendo imagen con OCR…';const r=await Tesseract.recognize(file,'spa');text=r.data.text}
    else if(type==='pdf'){if(!window.pdfjsLib)throw new Error('PDF.js no disponible');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const buf=await file.arrayBuffer();const pdf=await pdfjsLib.getDocument({data:buf}).promise;for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const c=await page.getTextContent();const groups={};c.items.forEach(it=>{const y=Math.round(it.transform?.[5]||0);(groups[y]??=[]).push(it)});const ys=Object.keys(groups).map(Number).sort((a,b)=>b-a);text+=ys.map(y=>groups[y].sort((a,b)=>(a.transform?.[4]||0)-(b.transform?.[4]||0)).map(x=>x.str).join(' ')).join('\n')+'\n'}}
    else if(type==='docx'){if(!window.mammoth)throw new Error('Mammoth no disponible');const r=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});text=r.value}
    if(!text.trim())throw new Error('No pude extraer texto de ese archivo'); status.textContent='Listo. Abriendo editor para revisión…';setTimeout(()=>openEditor(null,parseImportedText(text)),350);
  }catch(e){status.textContent='No se pudo procesar automáticamente: '+e.message+'. Puedes pegar el contenido manualmente.'}
}

function setPadKey(key){const a=$('#padAudio');const was=!a.paused;if(a.dataset.key===key)return; a.pause();a.src=PAD_FILES[key]||PAD_FILES.C;a.dataset.key=key;a.currentTime=0;if(was)a.play().catch(()=>{}); syncPadButtons()}
function syncPadKey(key){$('#padKeySelect').value=key;$('#stagePadKey').value=key;setPadKey(key)}
function togglePad(){const a=$('#padAudio');if(!a.src)setPadKey($('#padKeySelect').value||'C');if(a.paused)a.play().catch(()=>toast('Toca otra vez para iniciar el audio'));else a.pause();syncPadButtons()}
function syncPadButtons(){const playing=!$('#padAudio').paused;$('#padPlayBtn').textContent=playing?'❚❚':'▶';$('#stagePadPlay').textContent=playing?'❚❚ PAD':'▶ PAD'}

function openStage(id,list=null){
  const s=state.songs.find(x=>x.id===id);if(!s)return;hidePanel('songPanel');stageSongIds=(list&&list.length?list:state.songs.map(x=>x.id));stageIndex=Math.max(0,stageSongIds.indexOf(id));renderStage(s);$('#stageView').classList.remove('hidden');document.body.style.overflow='hidden';
}
function renderStage(s){
  currentSongId=s.id;$('#stageTitle').textContent=s.title;$('#stageArtist').textContent=s.artist||'';$('#stageKey').textContent='Tono '+effectiveKey(s);$('#stageBpm').textContent=(s.bpm||'—')+' BPM';$('#stageMeter').textContent=s.meter||'4/4';$('#stagePadKey').value=effectiveKey(s);document.documentElement.style.setProperty('--stage-size',`${Math.max(20,(s.fontSize||18)+7)}px`);
  $('#stageSections').innerHTML=orderedSections(s).map(sec=>`<section class="reader-section"><div class="section-label">${escapeHTML(sec.title||sec.type)}</div><div class="section-text">${contentHTML(sec.content,s.transpose||0)}</div></section>`).join('');$('#stageScroller').scrollTop=0;$('#stageProgress').textContent=`${stageIndex+1} / ${stageSongIds.length}`;syncPadKey(effectiveKey(s));
}
function exitStage(){stopAutoScroll();$('#stageView').classList.add('hidden');document.body.style.overflow='';}
function toggleAutoScroll(){autoScrollRunning?stopAutoScroll():startAutoScroll()}
function startAutoScroll(){autoScrollRunning=true;autoScrollLast=performance.now();state.prefs.scrollSpeed=+$('#scrollSpeed').value;saveState();$('#autoScrollBtn').textContent='❚❚ Autoscroll';autoScrollRAF=requestAnimationFrame(autoScrollTick)}
function stopAutoScroll(){autoScrollRunning=false;cancelAnimationFrame(autoScrollRAF);$('#autoScrollBtn').textContent='▶ Autoscroll'}
function autoScrollTick(t){if(!autoScrollRunning)return;const dt=(t-autoScrollLast)/1000;autoScrollLast=t;const v=+$('#scrollSpeed').value;const px=(v/100)*140;$('#stageScroller').scrollTop+=px*dt;autoScrollRAF=requestAnimationFrame(autoScrollTick)}
function nextStage(dir){if(!stageSongIds.length)return;stageIndex=(stageIndex+dir+stageSongIds.length)%stageSongIds.length;const s=state.songs.find(x=>x.id===stageSongIds[stageIndex]);if(s)renderStage(s)}

function bind(){
  $$('.nav-btn').forEach(b=>b.onclick=()=>switchView(b.dataset.view));$('#searchInput').oninput=renderLibrary;$('#keyFilter').onchange=renderLibrary;
  $('#newSongBtn').onclick=()=>openEditor();$('#importBtn').onclick=()=>showPanel('importPanel');$('#newSetlistBtn').onclick=()=>{const name=prompt('Nombre del setlist:');if(name){state.setlists.push({id:uid(),name,songs:[]});saveState();renderSetlists()}};
  $$('[data-close]').forEach(b=>b.onclick=()=>hidePanel(b.dataset.close));$('#cancelEditorBtn').onclick=()=>hidePanel('editorPanel');$('#saveSongBtn').onclick=saveEditingSong;
  $$('.quick-sections button').forEach(b=>b.onclick=()=>addEditorSection(b.dataset.section));$$('.tab').forEach(b=>b.onclick=()=>activateEditorTab(b.dataset.editorTab));$('#restoreArrangementBtn').onclick=()=>{editingSong.arrangement=[...editingSong.originalOrder];renderArrangement();toast('Orden original restaurado')};$('#songKeyInput').onchange=()=>renderChordPalette();
  $('#processPasteBtn').onclick=()=>{const t=$('#pasteImportText').value.trim();if(!t)return toast('Pega primero un cifrado');openEditor(null,parseImportedText(t))};
  $('#imageImport').onchange=e=>e.target.files[0]&&importFile(e.target.files[0],'image');$('#pdfImport').onchange=e=>e.target.files[0]&&importFile(e.target.files[0],'pdf');$('#docxImport').onchange=e=>e.target.files[0]&&importFile(e.target.files[0],'docx');
  $('#transposeDown').onclick=()=>changeTranspose(-1);$('#transposeUp').onclick=()=>changeTranspose(1);$('#fontDown').onclick=()=>changeReaderFont(-1);$('#fontUp').onclick=()=>changeReaderFont(1);$('#editSongBtn').onclick=()=>{hidePanel('songPanel');openEditor(currentSongId)};$('#stageBtn').onclick=()=>openStage(currentSongId);
  $('#padKeySelect').onchange=e=>{setPadKey(e.target.value);$('#stagePadKey').value=e.target.value};$('#stagePadKey').onchange=e=>{setPadKey(e.target.value);$('#padKeySelect').value=e.target.value};$('#padPlayBtn').onclick=togglePad;$('#stagePadPlay').onclick=togglePad;$('#padAudio').onplay=syncPadButtons;$('#padAudio').onpause=syncPadButtons;
  const vol=e=>{const v=+e.target.value;$('#padAudio').volume=v;$('#padVolume').value=v;$('#stagePadVolume').value=v;state.prefs.padVolume=v;saveState()};$('#padVolume').oninput=vol;$('#stagePadVolume').oninput=vol;const pv=state.prefs.padVolume??.55;$('#padAudio').volume=pv;$('#padVolume').value=pv;$('#stagePadVolume').value=pv;$('#scrollSpeed').value=state.prefs.scrollSpeed??28;$('#scrollSpeed').oninput=e=>{state.prefs.scrollSpeed=+e.target.value;saveState()};
  $('#exitStageBtn').onclick=exitStage;$('#autoScrollBtn').onclick=toggleAutoScroll;$('#prevSongBtn').onclick=()=>nextStage(-1);$('#nextSongBtn').onclick=()=>nextStage(1);$('#stageFontDown').onclick=()=>changeStageFont(-2);$('#stageFontUp').onclick=()=>changeStageFont(2);
  document.addEventListener('keydown',e=>{if(!$('#stageView').classList.contains('hidden')){if(e.key==='Escape')exitStage();if(e.key===' ') {e.preventDefault();toggleAutoScroll()}if(e.key==='ArrowRight'&&e.altKey)nextStage(1);if(e.key==='ArrowLeft'&&e.altKey)nextStage(-1)}})
}
function changeTranspose(d){const s=state.songs.find(x=>x.id===currentSongId);if(!s)return;s.transpose=(s.transpose||0)+d;saveState();$('#readerKey').textContent=effectiveKey(s);$('#padKeySelect').value=effectiveKey(s);renderReader(s)}
function changeReaderFont(d){const s=state.songs.find(x=>x.id===currentSongId);if(!s)return;s.fontSize=Math.max(13,Math.min(32,(s.fontSize||18)+d));saveState();document.documentElement.style.setProperty('--reader-size',`${s.fontSize}px`)}
function changeStageFont(d){const cur=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--stage-size'))||25;document.documentElement.style.setProperty('--stage-size',`${Math.max(18,Math.min(48,cur+d))}px`)}

initSelects();bind();renderLibrary();renderSetlists();
