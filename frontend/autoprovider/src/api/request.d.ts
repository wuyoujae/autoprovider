import { AxiosRequestConfig } from "axios";

interface RequestOptions extends Omit<AxiosRequestConfig, "url" | "method"> {
  url: string;
  method?: "get" | "post" | "put" | "delete" | "patch";
  data?: any;
  params?: any;
  showSuccessMessage?: boolean;
  showErrorMessage?: boolean;
}

declare function request<T = any>(options: RequestOptions): Promise<T>;

export default request;

