import { toLower } from 'lodash-es';

import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat.js';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';
dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);

import { format } from '../support/helpers.js';

const ACCEPT_COOKIES_CLOSE = '[class$="banner-close-button ot-close-icon"]';

describe('scrape rankings', () => {
    it('---------------', () => {
        const rankings = {};

        cy.visit('https://www.ufc.com')
            .then(() => {
                cy.wait(3000)
                    .get('body')
                    .then(body => {
                        if (body.find(ACCEPT_COOKIES_CLOSE).length) {
                            cy.get(ACCEPT_COOKIES_CLOSE).should('be.visible').click();
                        }
                    })

                    .get('ul[data-main-menu="smart-menu"]')
                    .should('be.visible')
                    .get('a[data-drupal-link-system-path="rankings"]')
                    .should('be.visible')
                    .click()

                    .get('[class="list-denotions"]')
                    .within(() => {
                        cy.get('p:nth-of-type(1)')
                            .invoke('text')
                            .then(updated => {
                                rankings.starting =
                                    updated
                                        .trim()
                                        .replace('\n                    ', ' ')
                                        .replace('Last updated: ', '') + `, ${dayjs().format('YYYY')}`;
                                rankings.ending = '';
                                rankings.run = toLower(dayjs().format('LLL'));
                                rankings.divisions = [];
                            });
                    })
                    .get('[class="view-grouping"]')
                    .each(grouping => {
                        cy.wrap(grouping).within(() => {
                            cy.get('[class="view-grouping-header"]')
                                .invoke('text')
                                .then(heading => {
                                    const division = {};
                                    division.heading = heading.trim().toLowerCase();
                                    division.list = [];

                                    // POUND FOR POUND HAS NO CHAMPION
                                    if (!heading.includes('Pound-for-Pound')) {
                                        cy.get('[class*="rankings--athlete--champion"]').within(() => {
                                            cy.get('h5')
                                                .invoke('text')
                                                .then(champ => {
                                                    division.list.push({
                                                        rank: 'champion',
                                                        name: format(
                                                            champ
                                                                .toLowerCase()
                                                                .replace('(c)', '')
                                                                .replace('(ic)', '')
                                                                .replace('*', '')
                                                                .replace('undefined', '')
                                                                .replaceAll('.', '')
                                                                .replaceAll('-', ' ')
                                                                .trim()
                                                        )
                                                    });
                                                });
                                        });
                                    }

                                    cy.get('[class="view-grouping-content"]').within(() => {
                                        cy.get('tbody').within(() => {
                                            cy.get('tr').each((tr, i) => {
                                                const indexOfRow = i + 1;
                                                const row = {};
                                                cy.get(`tr:nth-of-type(${indexOfRow}) [class$="rank"]`)
                                                    .invoke('text')
                                                    .then(current => {
                                                        // FIXING TIE IF IT EXISTS - LOOKING AT PREVIOUS ROW

                                                        row.rank = tr.find('[class$="athlete-rankings--interim"]')
                                                            .length
                                                            ? '#1 (interim)'
                                                            : '#' + current.trim();
                                                    })
                                                    .get(`tr:nth-of-type(${indexOfRow}) [class$="title"]`)
                                                    .invoke('text')
                                                    .then(name => {
                                                        row.name = format(
                                                            name
                                                                .toLowerCase()
                                                                .replace('(c)', '')
                                                                .replace('(ic)', '')
                                                                .replace('*', '')
                                                                .replace('undefined', '')
                                                                .replaceAll('.', '')
                                                                .replaceAll('-', ' ')
                                                                .trim()
                                                        );
                                                    })
                                                    .get(`tr:nth-of-type(${indexOfRow}) [class*="class-rank-change"]`)
                                                    .invoke('text')
                                                    .then(change => {
                                                        const numberOnly = change
                                                            .replace(/(Rank (decreased|increased) by |interim)/, '')
                                                            .trim()
                                                            .toLowerCase();

                                                        row.change = !/Rank (decreased|increased) by/.test(change)
                                                            ? numberOnly
                                                            : /Rank increased by/.test(change)
                                                              ? `+${numberOnly}`
                                                              : `-${numberOnly}`;
                                                    });

                                                division.list.push(row);
                                            });
                                        });
                                        rankings.divisions.push(division);
                                    });
                                });
                        });
                    });
            })
            .then(() => {
                const dateOfRankings = rankings.starting.replace('Last updated: ', '');
                const monthOfTheYear = dayjs(dateOfRankings).format('MMMM').toLowerCase();
                const dayOfTheMonth = dayjs(dateOfRankings).format('DD');

                cy.writeFile(
                    `./years/${dayjs().format('YYYY')}/rankings/${monthOfTheYear}/${dayOfTheMonth}.js`,
                    `export const RANKINGS = ` + JSON.stringify(rankings)
                );
            });
    });
});
