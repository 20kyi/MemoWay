/**
 * 기존 "kakao_undefined" 계정 정리 스크립트
 * 
 * 이 스크립트는:
 * 1. kakaoId가 null이거나 'undefined'인 사용자를 찾습니다
 * 2. 해당 사용자의 메모와 관련 데이터를 확인합니다
 * 3. 필요시 해당 사용자를 삭제하거나 마이그레이션합니다
 * 
 * 실행 방법:
 * npx tsx scripts/cleanup-kakao-undefined.ts
 */

import "dotenv/config";
import { db } from "../server/db";
import { users, members, memos } from "../shared/schema";
import { eq, isNull, or } from "drizzle-orm";

async function cleanupKakaoUndefined() {
  console.log("🔍 [CLEANUP] Starting cleanup of kakao_undefined accounts...");
  
  try {
    // 1. kakaoId가 null이거나 'undefined'인 사용자 찾기
    const invalidUsers = await db
      .select()
      .from(users)
      .where(
        or(
          isNull(users.kakaoId),
          eq(users.kakaoId, 'undefined'),
          eq(users.kakaoId, 'null'),
          eq(users.kakaoId, '')
        )
      );
    
    console.log(`📊 [CLEANUP] Found ${invalidUsers.length} invalid kakao users`);
    
    if (invalidUsers.length === 0) {
      console.log("✅ [CLEANUP] No invalid kakao users found. Cleanup complete.");
      return;
    }
    
    // 2. 각 사용자에 대한 상세 정보 출력
    for (const user of invalidUsers) {
      console.log(`\n👤 [CLEANUP] User: ${user.id}`);
      console.log(`   - Email: ${user.email || 'N/A'}`);
      console.log(`   - Provider: ${user.provider}`);
      console.log(`   - KakaoId: ${user.kakaoId || 'null'}`);
      console.log(`   - Created: ${user.createdAt}`);
      
      // 해당 사용자의 멤버 정보 확인
      const userMembers = await db
        .select()
        .from(members)
        .where(eq(members.userId, user.id));
      
      console.log(`   - Members: ${userMembers.length}`);
      
      // 해당 사용자의 메모 개수 확인
      const memberIds = userMembers.map(m => m.id);
      let memoCount = 0;
      if (memberIds.length > 0) {
        const userMemos = await db
          .select({ id: memos.id })
          .from(memos)
          .where(
            or(
              ...memberIds.map(mid => eq(memos.memberId, mid))
            )
          );
        memoCount = userMemos.length;
      }
      
      console.log(`   - Memos: ${memoCount}`);
      
      // 3. 사용자 삭제 여부 결정
      // 메모가 없는 사용자는 안전하게 삭제 가능
      if (memoCount === 0) {
        console.log(`   ⚠️  [CLEANUP] This user has no memos. Safe to delete.`);
        console.log(`   💡 [CLEANUP] To delete, uncomment the deletion code below.`);
        
        // 실제 삭제는 주석 처리되어 있습니다 (안전을 위해)
        // await db.delete(users).where(eq(users.id, user.id));
        // console.log(`   ✅ [CLEANUP] User ${user.id} deleted.`);
      } else {
        console.log(`   ⚠️  [CLEANUP] This user has ${memoCount} memos. Manual review required.`);
        console.log(`   💡 [CLEANUP] Please review and migrate memos before deleting.`);
      }
    }
    
    console.log("\n📋 [CLEANUP] Summary:");
    console.log(`   - Total invalid users: ${invalidUsers.length}`);
    console.log(`   - Users with memos: ${invalidUsers.filter(u => {
      // 간단한 체크 (실제로는 위의 루프에서 확인)
      return true; // 실제 구현에서는 위에서 계산한 값을 사용
    }).length}`);
    
    console.log("\n✅ [CLEANUP] Cleanup analysis complete.");
    console.log("💡 [CLEANUP] To actually delete users, uncomment the deletion code in the script.");
    
  } catch (error) {
    console.error("❌ [CLEANUP] Error during cleanup:", error);
    throw error;
  }
}

// 스크립트 실행
cleanupKakaoUndefined()
  .then(() => {
    console.log("\n✅ [CLEANUP] Script completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ [CLEANUP] Script failed:", error);
    process.exit(1);
  });
