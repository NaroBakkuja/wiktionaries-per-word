import {createQueryEngine} from './engine.mjs?v=2';
const engine=createQueryEngine(url=>fetch(url));
self.onmessage=async({data:s})=>{
  try {
    const result=await engine.query(s,progress=>self.postMessage({id:s.id,progress}));
    self.postMessage({id:s.id,...result});
  } catch(e){self.postMessage({id:s.id,error:e.message});}
};
