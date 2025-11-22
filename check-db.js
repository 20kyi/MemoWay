/**
 * 데이터베이스 확인 스크립트
 * Replit에서 저장한 메모가 있는지 확인
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkDatabase() {
  try {
    console.log('데이터베이스 연결 확인 중...\n');
    
    // 사용자 확인
    const users = await pool.query('SELECT id, email, first_name, provider FROM users ORDER BY created_at DESC LIMIT 10');
    console.log('=== 사용자 목록 (최근 10명) ===');
    users.rows.forEach((user, i) => {
      console.log(`${i + 1}. ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name}, Provider: ${user.provider}`);
    });
    console.log(`\n총 사용자 수: ${users.rows.length}\n`);
    
    // 그룹 확인
    const groups = await pool.query('SELECT id, name, invite_code FROM groups ORDER BY created_at DESC LIMIT 10');
    console.log('=== 그룹 목록 (최근 10개) ===');
    groups.rows.forEach((group, i) => {
      console.log(`${i + 1}. ID: ${group.id}, Name: ${group.name}, InviteCode: ${group.invite_code}`);
    });
    console.log(`\n총 그룹 수: ${groups.rows.length}\n`);
    
    // 멤버 확인
    const members = await pool.query('SELECT id, user_id, group_id, name, role FROM members ORDER BY joined_at DESC LIMIT 10');
    console.log('=== 멤버 목록 (최근 10명) ===');
    members.rows.forEach((member, i) => {
      console.log(`${i + 1}. ID: ${member.id}, UserID: ${member.user_id}, GroupID: ${member.group_id}, Name: ${member.name}, Role: ${member.role}`);
    });
    console.log(`\n총 멤버 수: ${members.rows.length}\n`);
    
    // 메모 확인
    const memos = await pool.query('SELECT id, member_id, group_id, building_name, content, created_at FROM memos ORDER BY created_at DESC LIMIT 10');
    console.log('=== 메모 목록 (최근 10개) ===');
    memos.rows.forEach((memo, i) => {
      console.log(`${i + 1}. ID: ${memo.id}, MemberID: ${memo.member_id}, GroupID: ${memo.group_id || 'null'}, Building: ${memo.building_name}, Created: ${memo.created_at}`);
    });
    console.log(`\n총 메모 수: ${memos.rows.length}\n`);
    
    // 전체 메모 수
    const totalMemos = await pool.query('SELECT COUNT(*) as count FROM memos');
    console.log(`전체 메모 수: ${totalMemos.rows[0].count}\n`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();

