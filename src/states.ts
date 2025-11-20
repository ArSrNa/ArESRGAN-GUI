import { atom } from "recoil";

export const filesState = atom<File[] | null>({
  key: "files",
  default: [],
  dangerouslyAllowMutability: true,
});

export const modelsState = atom<{ label: string; value: string }[]>({
  key: "model",
  default: [],
});
