import { atom } from "recoil";
import { DataSourceType } from "./types";

export const DataSourceState = atom<Array<DataSourceType>>({
  key: "DataSource",
  default: [],
  dangerouslyAllowMutability: true,
});

export const filesState = atom<File[] | null>({
  key: "files",
  default: [],
  dangerouslyAllowMutability: true,
});

export const modelsState = atom<{ label: string; value: string }[]>({
  key: "model",
  default: [],
});
