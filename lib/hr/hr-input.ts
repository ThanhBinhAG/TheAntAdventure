/** HR staff directory DTO (no salary fields). */

export type HrStaffListItem = {
  id: string;
  name: string;
  ename?: string;
  dept: string;
  pos: string;
  phone?: string;
  email?: string;
  start?: string;
  contract?: string;
  status: string;
};
