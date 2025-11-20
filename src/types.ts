export interface DataSourceType {
  /**列唯一id，标识删除用 */
  index: number;
  /**原图 */
  origin: string;
  /**处理后路径（保存路径，TODO） */
  path: string;
  /**进度 */
  progress: number;
  /**处理后图片 */
  process?: string;
  /**处理状态 */
  status: string;
}

export interface FormDataType {
  /**文件 */
  files: File[];
  /**模型选择 */
  model: string;
  /**输出路径 */
  output: {
    /**输出模式 */
    mode: "custom" | "current";
    /**输出路径 */
    path?: string;
  };
}
