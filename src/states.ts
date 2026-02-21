import { atom } from "jotai";

export const filesState = atom<File[]>([]);

export const modelsState = atom<{ label: string; value: string }[]>([]);
