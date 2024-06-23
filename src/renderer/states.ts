import { atom } from 'recoil';
import { DataSourceType } from './types';

export const DataSourceState = atom<Array<DataSourceType> | []>({
  key: 'DataSource',
  default: [],
});
