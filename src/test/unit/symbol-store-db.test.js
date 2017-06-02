/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import 'babel-polyfill';
import { SymbolStoreDB } from '../../content/symbol-store-db';
import exampleSymbolTable from '../fixtures/example-symbol-table';
import fakeIndexedDB from 'fake-indexeddb';
import FDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

describe('SymbolStoreDB', function () {
  const libs = Array.from({ length: 10 }).map((_, i) => ({ debugName: `firefox${i}`, breakpadId: `breakpadId${i}` }));

  beforeAll(function () {
    global.window = {
      indexedDB: fakeIndexedDB,
      IDBKeyRange: FDBKeyRange,
    };
  });

  afterAll(function () {
    delete global.window;
  });

  it('should respect the maximum number of tables limit', async function () {
    const symbolStoreDB = new SymbolStoreDB('testing-symbol-tables', 5); // maximum 5

    // Try to store 10 symbol tables in a database that only allows 5.
    // All stores should succeed but the first 5 should be evicted again.
    for (const lib of libs) {
      await symbolStoreDB.storeSymbolTable(lib.debugName, lib.breakpadId, exampleSymbolTable);
    }

    for (let i = 0; i < 5; i++) {
      await expect(symbolStoreDB.getSymbolTable(libs[i].debugName, libs[i].breakpadId))
          .rejects.toBeInstanceOf(Error);
//        .rejects.toMatch('does not exist in the database'); // TODO Some future verison of jest should make this work
    }

    for (let i = 5; i < 10; i++) {
      // We should be able to retrieve all last 5 tables
      await expect(symbolStoreDB.getSymbolTable(libs[i].debugName, libs[i].breakpadId))
        .resolves.toBeInstanceOf(Array);
    }

    await symbolStoreDB.close();
  });

  it('should still contain those five symbol tables after opening the database a second time', async function () {
    const symbolStoreDB = new SymbolStoreDB('testing-symbol-tables', 5); // maximum 5

    for (let i = 0; i < 5; i++) {
      await expect(symbolStoreDB.getSymbolTable(libs[i].debugName, libs[i].breakpadId))
          .rejects.toBeInstanceOf(Error);
//        .rejects.toMatch('does not exist in the database'); // TODO Some future verison of jest should make this work
    }

    for (let i = 5; i < 10; i++) {
      // We should be able to retrieve all last 5 tables
      await expect(symbolStoreDB.getSymbolTable(libs[i].debugName, libs[i].breakpadId))
        .resolves.toBeInstanceOf(Array);
    }

    await symbolStoreDB.close();
  });

  it('should still evict all tables when opening with the age limit set to 0ms', async function () {
    const symbolStoreDB = new SymbolStoreDB('testing-symbol-tables', 10, 0); // maximum count 10, maximum age 0

    for (let i = 0; i < 10; i++) {
      await expect(symbolStoreDB.getSymbolTable(libs[i].debugName, libs[i].breakpadId))
        .rejects.toBeInstanceOf(Error);
//        .rejects.toMatch('does not exist in the database'); // TODO Some future verison of jest should make this work
    }

    await symbolStoreDB.close();
  });
});