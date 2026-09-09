export interface LatestDocument {
    title: string;
    date: string;
    location: string;
    phoneNumber: string;
    url: string;
    source: string;
    hash: string;
}
export interface LatestDocumentCallbackModel {
    generic_model: LatestDocument[];
    leak_model: LatestDocument[];
    defacement_model: LatestDocument[];
    chat_model: LatestDocument[];
    exploit_model: LatestDocument[];
    [key: string]: LatestDocument[];
}
