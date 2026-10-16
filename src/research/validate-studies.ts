import { studyCatalog, conditionSpace, defaultParameters, inputIssue, variants } from './catalog';
import { computeField, executeStudy } from './computation';
import { sameOutcome } from './engine';

/** Validate the actual public grids against incrementally executed assertions. */
export function validateStudies(): { issues:string[]; models:number; conditions:number; assertions:number; events:number } {
  const issues:string[]=[];let conditions=0;let assertions=0;let events=0;
  const ids=new Set<string>();
  for(const study of studyCatalog){
    if(ids.has(study.id))issues.push('Duplicate study: '+study.id);ids.add(study.id);
    for(const parameters of [defaultParameters,{...defaultParameters,extent:3,depthLimit:8},{...defaultParameters,contractKnown:false}]){
      const cells=computeField(study,parameters);conditions+=cells.length;
      if(new Set(cells.map(cell=>cell.id)).size!==cells.length)issues.push(study.id+': duplicate cell ID');
      if(conditionSpace(study,parameters).length!==cells.length)issues.push(study.id+': grid length mismatch');
      for(const cell of cells){
        if(inputIssue(study,cell.input))issues.push(study.id+'/'+cell.id+': invalid authored input');
        for(const variant of variants(study)){
          let assertionCount=0;const expected=cells.find(item=>item.id===cell.id)!.results[variant.id];
          for(const event of executeStudy(study,parameters,cells,'focused',cell.id,variant.id)){
            events++;
            if(event.line<0||event.line>variant.code.split('\n').length)issues.push(study.id+': source annotation out of bounds');
            if(event.kind==='ASSERTION'){
              assertions++;assertionCount++;
              if(!event.outcome||!sameOutcome(event.outcome,expected.outcome)||event.passed!==expected.passed)issues.push(study.id+'/'+cell.id+'/'+variant.id+': trace/grid mismatch');
            }
          }
          if(assertionCount!==1)issues.push(study.id+'/'+cell.id+'/'+variant.id+': missing or duplicate assertion');
        }
      }
    }
  }
  return{issues,models:ids.size,conditions,assertions,events};
}
