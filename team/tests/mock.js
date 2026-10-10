// Synthetic data only. Loaded exclusively by fixture.html, never by /team/.
(() => {
  const mode=new URLSearchParams(location.search).get('mode')||'member';
  const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const date=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const me={id:id(1),email:'tester@example.test',name:'Taylor Example',role:'Team coordinator',active:true,is_admin:mode==='admin'||mode==='legacy-admin'};
  const people=[me,{id:id(2),email:'other@example.test',name:'Jordan Example',role:'Operations',active:true},{id:id(3),email:'inactive@example.test',name:'Inactive Member',active:false}];
  let tasks=mode==='empty'?[]:[
    {id:id(11),title:'Community outreach',description:'Confirm the volunteer schedule.',assignee_id:id(1),created_by_id:id(1),due_date:date(-2),status:'not_started',priority:'high',category:'Community',requires_submission:false},
    {id:id(12),title:'Resource directory',description:'Review the latest local resources.',assignee_id:id(1),created_by_id:id(1),due_date:date(3),status:'in_progress',priority:'normal',category:'Research',requires_submission:true},
    {id:id(13),title:'Supply pickup',description:'Collect donated supplies.',assignee_id:id(2),created_by_id:id(1),due_date:null,status:'not_started',priority:'high',category:'Operations',requires_submission:false},
    {id:id(14),title:'Volunteer guide',assignee_id:id(1),created_by_id:id(1),due_date:date(1),status:'submitted',priority:'normal',category:'Community',requires_submission:true,submitted_at:new Date().toISOString()},
    {id:id(15),title:'Completed inventory',assignee_id:id(2),created_by_id:id(1),status:'done',priority:'low',completed_at:new Date().toISOString()},
    {id:id(16),title:'Final event report',assignee_id:id(1),created_by_id:id(1),due_date:date(6),status:'in_progress',priority:'normal',category:'Operations',requires_submission:true}
  ];
  tasks.forEach(t=>t.updated_at='2026-01-01T00:00:00.000Z');
  let submissions=mode==='empty'?[]:[{id:id(21),task_id:id(14),submitted_by_id:id(1),submission_type:'drive_link',drive_url:'https://docs.google.com/document/d/test-fixture',notes:'Ready for review.',submitted_at:new Date().toISOString()}];
  const state=window.portalMock={mode,id,me,people,uploads:[],removed:[],writes:[],failInsert:false,loseInsertResponse:false,failDocuments:false,delay:0,get tasks(){return tasks},get submissions(){return submissions}};
  window.confirm=()=>true;
  sessionStorage.removeItem('happys-team-pending-'+me.id);
  const client={auth:{
    getUser:async()=>({data:{user:{id:me.id,email:me.email}},error:null}),
    onAuthStateChange:cb=>{state.auth=cb;setTimeout(()=>cb('INITIAL_SESSION',mode==='login'?null:{user:{id:me.id}}),0);},
    signOut:async()=>{state.auth('SIGNED_OUT',null);return{error:null}},
    signInWithOAuth:async(options)=>{state.oauth=options;return{error:null}}
  },from:table=>{
    let operation='read',payload,filters=[],start=0,end=99,limit,columns;
    const q={select:value=>{columns=value;return q;},eq:(key,value)=>{filters.push([key,value]);return q;},is:(key,value)=>{filters.push([key,value]);return q;},order:()=>q,range:(a,b)=>{start=a;end=b;return q;},limit:n=>{limit=n;return q;},insert:p=>{operation='insert';payload=p;return q;},update:p=>{operation='update';payload=p;return q;},delete:()=>{operation='delete';return q;},maybeSingle:()=>run(true),then:(yes,no)=>run().then(yes,no)};
    async function run(single=false){
      if(state.delay&&table==='tasks')await new Promise(r=>setTimeout(r,state.delay));
      if(mode.startsWith('legacy')&&table==='tasks'&&columns==='requires_submission,submitted_at')return{data:null,error:{code:'42703',message:'missing column'}};
      if(mode==='denied'&&table==='team_members'&&single)return{data:null,error:null};
      if(state.failDocuments&&table==='submissions'&&operation==='read')return{data:null,error:{message:'simulated document failure'}};
      let rows=table==='tasks'?tasks:table==='team_members'?people:submissions;
      const matches=row=>filters.every(([key,value])=>value===null?row[key]==null:row[key]===value);
      if(operation!=='read'){
        state.writes.push({table,operation,payload,filters});
        if(state.failInsert&&table==='submissions'){state.failInsert=false;return{data:null,error:{code:'42501',message:'denied'}};}
        if(operation==='insert'){
          const row={...payload,id:payload.id||crypto.randomUUID(),submitted_at:new Date().toISOString(),updated_at:new Date().toISOString()};rows.push(row);
          if(table==='submissions'){const task=tasks.find(t=>t.id===row.task_id);task.status='submitted';task.submitted_at=row.submitted_at;}
          if(table==='submissions'&&state.loseInsertResponse){state.loseInsertResponse=false;return{data:null,error:{message:'simulated lost response'}};}
          return{data:[{id:row.id}],error:null};
        }
        const affected=rows.filter(matches);
        if(operation==='update')affected.forEach(t=>Object.assign(t,payload,{updated_at:new Date().toISOString(),completed_at:payload.status==='done'?new Date().toISOString():null}));
        if(operation==='delete'){if(table==='tasks')tasks=tasks.filter(t=>!matches(t));}
        return{data:affected.map(t=>({id:t.id})),error:null};
      }
      rows=rows.filter(matches);if(limit===0)rows=[];else rows=rows.slice(start,end+1);
      return{data:single?(rows[0]||null):rows.map(row=>({...row})),error:null};
    }
    return q;
  },storage:{from:bucket=>({upload:async(path,file,options)=>{state.uploads.push({bucket,path,name:file.name,options});return{data:{path},error:null};},remove:async paths=>{state.removed.push(...paths);return{data:[],error:null};},createSignedUrl:async(path,seconds,options)=>{state.signed={path,seconds,options};return{data:{signedUrl:'https://qdpzbyseanfqzuhtfpbd.supabase.co/storage/v1/object/sign/team-submissions/test?token=fixture'},error:null};}})}};
  window.supabase={createClient:(url,key,options)=>{state.authOptions=options;return client;}};
})();
