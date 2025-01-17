export interface DataSourceType {
  /**列唯一id，标识删除用 */
  id: string;
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
