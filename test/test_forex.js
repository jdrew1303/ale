/*
 * @license
 * Copyright 2017 Cayle Sharrock
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under the License.
 */

const assert = require('assert');
let Book;
describe('ALE forex journals', () => {
    before((done) => {
        const sequelize = require('../models/connection');
        require('../models/transaction');
        require('../models/journal');
        sequelize.sync().then(() => {
            Book = require('../').Book;
            done();
        });
    });

    it('specify currencies in journal entries', () => {
        const book = new Book('Forex test');
        return book.entry('Base investment').then(entry => {
            return entry.credit('Trading:USD', 1650, 'USD', 1)
            .debit('Assets:Bank', 1650, 'USD', 1)
            .commit();
        }).then(() => {
            return book.balance({ account: ['Assets', 'Trading'] });
        }).then(result => {
            assert.equal(result.balance, 0);
            assert.equal(result.numTransactions, 2);
        })
    });

    it('handles multi-currency entries', () => {
        const book = new Book('Forex test');
        return book.entry('Buy 10000 ZAR for 1000').then(entry => {
            return entry.credit('Trading:ZAR', 10000, 'ZAR', 0.1)
            .debit('Trading:USD', 1050, 'USD', 1)
            .credit('Expenses:Fees', 50, 'USD', 1)
            .commit();
        }).then(() => {
            return book.balance({ account: ['Assets', 'Trading'] }, true);
        }).then(result => {
            assert.equal(result.balance, -50);
            assert.equal(result.numTransactions, 4);
            assert.equal(result.currency, 'USD');
        });
    });

    it('normalizes exchange rates', () => {
        const book = new Book('Forex Test');
        const norm = book.normalizeRates({ ZAR: 1, USD: 0.1, EUR: 0.08 });
        assert.deepEqual(norm, { ZAR: 10, USD: 1, EUR: 0.8 });
    });

    it('Calculates mark-to-market at a given set of rates', () => {
        const book = new Book('Forex test');
        return book.markToMarket({ account: ['Trading', 'Assets:Bank'] }, { ZAR: 20, USD: 1 }).then(result => {
            assert.equal(result['Trading:ZAR'], 500);
            assert.equal(result['Trading:USD'], 600);
            assert.equal(result.unrealizedProfit, -550);
        });
    });

    it('Reject mark-to-market if rates are missing', () => {
        const book = new Book('Forex test');
        return book.markToMarket({ account: ['Trading', 'Assets:Bank'] }, { USD: 1 }).then(() => {
            throw new Error('Should throw');
        }).catch(err => {
            assert(err);
        });
    });
});
