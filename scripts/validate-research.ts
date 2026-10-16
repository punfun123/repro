import { researchCases } from '../src/research/cases';
import { validateResearchCases } from '../src/research/validate';
import { datasetStatistics } from '../src/research/engine';
import { validateStudies } from '../src/research/validate-studies';
const publicFields=validateStudies();
const issues = [...validateResearchCases(researchCases),...publicFields.issues];
if (issues.length) { console.error(issues.join('\n')); process.exitCode = 1; }
else console.log(JSON.stringify({ provenance: 'LOCAL RULE COMPUTATION', validation: 'passed',publicFields,legacyFixtures:datasetStatistics(researchCases) }, null, 2));
