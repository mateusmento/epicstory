import {
  candidateIssueKeyPrefixFromProjectName,
  disambiguateIssueKeyPrefix,
  extractIssueKeysFromText,
  formatIssueKey,
  normalizeProjectKeyPrefix,
} from '../issue-key';

describe('issue-key', () => {
  it('formats keys', () => {
    expect(formatIssueKey('EPIC', 42)).toBe('EPIC-42');
  });

  it('extracts keys from branch and commit text', () => {
    expect(extractIssueKeysFromText('feature/EPIC-42-login-fix')).toEqual([
      'EPIC-42',
    ]);
    expect(
      extractIssueKeysFromText('EPIC-42: fix login\n\nRefs EPIC-99'),
    ).toEqual(['EPIC-42', 'EPIC-99']);
  });

  it('derives short prefixes from project names', () => {
    expect(candidateIssueKeyPrefixFromProjectName('Epicstory')).toBe('EPI');
    expect(candidateIssueKeyPrefixFromProjectName('Epic Story')).toBe('ES');
    expect(
      candidateIssueKeyPrefixFromProjectName('Human Resources Portal'),
    ).toBe('HRP');
    expect(candidateIssueKeyPrefixFromProjectName('Backend')).toBe('BAC');
    expect(candidateIssueKeyPrefixFromProjectName('Project 1')).toBe('PRO1');
    expect(candidateIssueKeyPrefixFromProjectName('Project 2')).toBe('PRO2');
    expect(candidateIssueKeyPrefixFromProjectName('Epic Story 2')).toBe('ES2');
  });

  it('extends prefix from name before numeric suffix', () => {
    const taken = new Set(['EPI']);
    expect(
      disambiguateIssueKeyPrefix('EPI', taken, { compactName: 'Epicstory' }),
    ).toBe('EPIC');
  });

  it('disambiguates with numeric suffix when extension exhausted', () => {
    const taken = new Set([
      'EPI',
      'EPIC',
      'EPICS',
      'EPICST',
      'EPICSTO',
      'EPICSTOR',
      'EPICSTORY',
    ]);
    expect(
      disambiguateIssueKeyPrefix('EPI', taken, { compactName: 'Epicstory' }),
    ).toBe('EPI2');
  });

  it('disambiguates taken prefixes with numeric suffix only', () => {
    const taken = new Set(['EPIC']);
    expect(disambiguateIssueKeyPrefix('EPIC', taken)).toBe('EPIC2');
  });

  it('normalizes custom project keys', () => {
    expect(normalizeProjectKeyPrefix('  epic ')).toBe('EPIC');
    expect(normalizeProjectKeyPrefix('1EPIC')).toBeNull();
    expect(normalizeProjectKeyPrefix('E')).toBeNull();
  });
});
