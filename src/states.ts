import { atom } from 'recoil';
import { DataSourceType } from './types';
import { UploadChangeParam, UploadFile } from 'antd/es/upload';

export const DataSourceState = atom<Array<DataSourceType>>({
  key: 'DataSource',
  default: [],
  dangerouslyAllowMutability: true,
});

export const filesState = atom<UploadChangeParam<UploadFile<any>>['fileList']>({
  key: 'files',
  default: [],
  dangerouslyAllowMutability: true,
});

export const modelsState = atom<{ label: string; value: string }[]>({
  key: 'model',
  default: [],
});
