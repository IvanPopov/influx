// automatically generated by the FlatBuffers compiler, do not modify

import { MatBundle, MatBundleT } from '../fx/mat-bundle';
import { PartBundle, PartBundleT } from '../fx/part-bundle';
import { Technique11Bundle, Technique11BundleT } from '../fx/technique11bundle';


export enum BundleContent {
  NONE = 0,
  PartBundle = 1,
  MatBundle = 2,
  Technique11Bundle = 3
}

export function unionToBundleContent(
  type: BundleContent,
  accessor: (obj:MatBundle|PartBundle|Technique11Bundle) => MatBundle|PartBundle|Technique11Bundle|null
): MatBundle|PartBundle|Technique11Bundle|null {
  switch(BundleContent[type]) {
    case 'NONE': return null; 
    case 'PartBundle': return accessor(new PartBundle())! as PartBundle;
    case 'MatBundle': return accessor(new MatBundle())! as MatBundle;
    case 'Technique11Bundle': return accessor(new Technique11Bundle())! as Technique11Bundle;
    default: return null;
  }
}

export function unionListToBundleContent(
  type: BundleContent, 
  accessor: (index: number, obj:MatBundle|PartBundle|Technique11Bundle) => MatBundle|PartBundle|Technique11Bundle|null, 
  index: number
): MatBundle|PartBundle|Technique11Bundle|null {
  switch(BundleContent[type]) {
    case 'NONE': return null; 
    case 'PartBundle': return accessor(index, new PartBundle())! as PartBundle;
    case 'MatBundle': return accessor(index, new MatBundle())! as MatBundle;
    case 'Technique11Bundle': return accessor(index, new Technique11Bundle())! as Technique11Bundle;
    default: return null;
  }
}