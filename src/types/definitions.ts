// A type alias for a function that takes a parameter of type T and returns void
export type Callable<T> = (data: T) => void;

// A type alias for a function that takes a string query and returns a Promise that resolves to a string
export type Generate = (query: string) => Promise<string>;

// An interface representing a document with an id and content
export interface Document {
  id: string;
  content: string;
}
