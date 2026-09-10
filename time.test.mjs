import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveStatus, availableActions, calculateDay, entriesByDay, formatMinutes } from '../src/time.js';

const e=(type, timestamp)=>({id:crypto.randomUUID(),employeeId:'x',type,timestamp});

test('status changes with terminal actions',()=>{
  assert.equal(deriveStatus([]),'off');
  assert.equal(deriveStatus([e('clock_in','2026-09-10T08:00:00Z')]),'working');
  assert.equal(deriveStatus([e('clock_in','2026-09-10T08:00:00Z'),e('break_start','2026-09-10T10:00:00Z')]),'break');
  assert.deepEqual(availableActions('working'),['break_start','clock_out']);
});

test('calculates work and break minutes',()=>{
  const rows=[
    e('clock_in','2026-09-10T08:00:00Z'),
    e('break_start','2026-09-10T10:00:00Z'),
    e('break_end','2026-09-10T10:30:00Z'),
    e('clock_out','2026-09-10T13:30:00Z')
  ];
  const result=calculateDay(rows,new Date('2026-09-11T00:00:00Z'));
  assert.equal(result.workMinutes,300);
  assert.equal(result.breakMinutes,30);
});

test('supports multiple work blocks in one day',()=>{
  const rows=[
    e('clock_in','2026-09-10T08:00:00Z'),e('clock_out','2026-09-10T10:00:00Z'),
    e('clock_in','2026-09-10T12:00:00Z'),e('clock_out','2026-09-10T15:00:00Z')
  ];
  assert.equal(calculateDay(rows,new Date('2026-09-11T00:00:00Z')).workMinutes,300);
});

test('groups entries by local day and formats signed time',()=>{
  const rows=[e('clock_in','2026-09-10T08:00:00Z'),e('clock_out','2026-09-10T09:00:00Z')];
  assert.equal(entriesByDay(rows).size,1);
  assert.equal(formatMinutes(-21,true),'−0:21 h');
});
