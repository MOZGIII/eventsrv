'use strict';
type StringualDictionary<T> = { [key: string]: T }
type NumericDictionary<T> = { [key: number]: T }

export class MutiValueHash<KeyType, ValueType> {
  dictionary: StringualDictionary<Array<ValueType>> | NumericDictionary<Array<ValueType>> = {};

  add(key: KeyType, value: ValueType) {
    var values = this.dictionary[<any>key];
    if (typeof values === "undefined") {
      values = [];
      this.dictionary[<any>key] = values;
    }
    values.push(value);
  }

  remove(key: KeyType, value: ValueType) {
    var values = this.dictionary[<any>key];
    if (typeof values === "undefined") {
      return;
    }
    var i = values.length;
    while (i) {
      if (values[i] === value) {
        values.splice(i, 1);
      } else {
        i--;
      }
    }
    if (values.length == 0) {
      this.flush(key);
    }
  }

  flush(key: KeyType) {
    delete this.dictionary[<any>key];
  }

  exist(key: KeyType): boolean {
    var values = this.dictionary[<any>key];
    return typeof values === "undefined";
  }

  valueExist(key: KeyType, value: ValueType): boolean {
    var values = this.dictionary[<any>key];
    if (typeof values === "undefined") {
      return false;
    }

    if (values.indexOf(value) >= 0) {
      return true;
    }

    return false;
  }

  get(key: KeyType): Array<ValueType> {
    var values = this.dictionary[<any>key];
    return (typeof values === "undefined") ? [] : values;
  }
}
