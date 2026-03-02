export interface Status {
  id: string;
  name: string;
  displayOrder: number;
  lightBgColor: string;
  lightTextColor: string;
  darkBgColor: string;
  darkTextColor: string;
  isActive: boolean;
}

export interface StatusFormData {
  name: string;
  displayOrder: number;
  lightBgColor: string;
  lightTextColor: string;
  darkBgColor: string;
  darkTextColor: string;
}
