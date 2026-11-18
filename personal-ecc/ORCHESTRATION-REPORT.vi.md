# Báo cáo cập nhật quy trình điều phối ECC

Ngày lập báo cáo ban đầu: 11/11/2026. Cập nhật gần nhất: 17/11/2026.

Phạm vi: bản triển khai hiện có trong checkout ECC; chưa commit/push bản cập nhật này.
Tài liệu đi kèm: [Hướng dẫn bắt đầu một tính năng mới](FEATURE-WORKFLOW-GUIDE.vi.md).

## 1. Kết quả và giới hạn cần hiểu trước

ECC hiện có cơ chế mô tả task, kiểm soát phụ thuộc, bàn giao công việc bằng worktree,
lưu trạng thái JSON, theo dõi trên dashboard và ghi nhận nghiệm thu theo phiên bản.
AI chính có thể dùng các cơ chế này để tổ chức công việc và giao cho agent được phép hoạt động.

**Chưa có bộ điều phối nền tự chạy các tiến trình Codex thật.** Lệnh công khai
`run --execute` bị chặn cho đến khi có sandbox filesystem/network được xác minh
đáp ứng yêu cầu không truy cập DB. Không dùng wrapper hoặc đổi lệnh để vượt chặn.

Luồng dùng được hiện tại:

```text
Người dùng nêu yêu cầu và phạm vi được phép
  → AI chọn trực tiếp / tuần tự / song song
  → nếu cần: lập plan và khởi tạo JSON run
  → AI prepare task đủ điều kiện
  → AI giao packet + worktree cho agent được phép
  → agent làm việc và trả result
  → AI submit, đối chiếu phiên bản và bằng chứng
  → review độc lập, accepted
  → tích hợp code tuần tự nếu đã được phép, integrated
  → tiếp tục task có đủ đầu vào
```

Người dùng không phải tự điều phối từng worker. Các lệnh trong hướng dẫn giúp
người dùng quan sát, kiểm tra hoặc thao tác khi muốn; AI chính có thể làm phần đó
trong phạm vi đã được giao.

## 2. Những vấn đề được giải quyết

| Nhu cầu | Thay đổi hiện có | Ý nghĩa thực tế |
|---|---|---|
| Không làm nặng yêu cầu nhỏ | Chọn chế độ trước khi tạo state | Câu hỏi và sửa nhỏ không phải mở board/worktree |
| Làm song song phần độc lập | Task có scope, phụ thuộc và giới hạn slot | Không giao sớm công việc đang thiếu đầu vào |
| Biết ai đang làm gì | Task, worker và attempt riêng | Một worker làm nhiều việc theo thời gian; retry không ghi đè lần cũ |
| Giảm sửa chồng file | Managed handoff tạo worktree riêng | Worker code không sửa trực tiếp checkout tích hợp |
| Không coi “xong” là đạt | Submit tách khỏi review và integration | Báo cáo của worker là đầu vào để đánh giá |
| Review đúng bản code | Gắn attempt, revision và outputHash | Thay đổi sau submit/review bị phát hiện |
| Dễ tiếp tục sau gián đoạn | JSON state, lock và lịch sử attempt | Đọc lại được trạng thái; không tự chạy lại việc chưa rõ kết quả |
| Không dùng DB để quản lý task | State là file JSON được chọn rõ | Không mở/migrate SQLite ECC hiện có |
| Mở rộng reviewer sau này | Có review receipt và điều kiện nghiệm thu | Chưa tự khởi chạy reviewer; cấu trúc đầu ra đã có |

## 3. Chọn quy trình theo độ lớn công việc

### Trực tiếp

Áp dụng cho câu hỏi, chỉnh văn bản, sửa nhỏ có phạm vi rõ. AI đọc phần liên quan,
thực hiện và kiểm tra phù hợp. Không tạo run file chỉ để hoàn thành thủ tục.

### Tuần tự

Áp dụng khi bước sau cần kết quả bước trước hoặc phần lớn thay đổi nằm trong cùng
module. Dùng một kế hoạch ngắn; không tách worker chỉ vì có nhiều đầu mục.

### Song song

Áp dụng khi có các phần đủ lớn, đầu vào đã rõ và scope độc lập. Không còn mặc định
cố định ba worker hoặc trần ECC tám worker. AI chọn `maxWorkers` theo task độc lập,
slot host/công cụ khả dụng và tài nguyên máy; chỉ nhận số nguyên dương an toàn.
Nếu thiếu slot, task được xếp hàng, không giả vờ đã chạy đồng thời. Số lớn hơn
không mặc nhiên tốt hơn và không được vượt giới hạn thực tế của môi trường.

Ví dụ: backend và frontend có thể code đồng thời sau khi API contract được chốt;
test tích hợp không thể kết luận trước khi hai phần đã tích hợp vào baseline.
Rủi ro cao có thể cần review kỹ hơn nhưng không tự động đồng nghĩa cần nhiều agent.

## 4. Cấu trúc quản lý công việc

| Khái niệm | Ví dụ | Trách nhiệm |
|---|---|---|
| Run | `exam-registration` | Một kế hoạch thực thi, repo, baseline và danh sách task |
| Task | `BE-01` | Mục tiêu, scope, acceptance, validation và phụ thuộc |
| Worker | `backend-worker-1` | Danh tính người/agent nhận task |
| Attempt | `BE-01-1`, `BE-01-2` | Một lần thực hiện; giữ kết quả/lý do thất bại riêng |
| Revision | Fingerprint của worktree | Định danh nội dung Git và thay đổi thực tế được submit |
| Output hash | Hash của result đã chuẩn hóa | Ràng buộc review với đúng báo cáo đầu ra |
| Review receipt | Người review, tiêu chí, kết luận, bằng chứng | Ghi nhận đánh giá đúng output |
| Integration receipt | Commit đã tồn tại, người tích hợp, bằng chứng | Xác nhận code được tích hợp, không tự tạo commit |

State và packet không thay thế BA, API contract hay code. Các tham chiếu trong
`inputs` phải được AI kiểm tra và truyền đúng nội dung; runtime không tự tải hoặc
xác minh tính đúng đắn của mọi đường dẫn/tài liệu được nhắc trong một chuỗi.

## 5. Trạng thái và điều kiện chuyển bước

| Trạng thái | Ý nghĩa | Ai cần làm tiếp |
|---|---|---|
| `pending` | Chưa đủ phụ thuộc | AI xử lý upstream hoặc báo blocker |
| `ready` | Phụ thuộc đã đủ | AI còn kiểm tra approval, pause và slot trước khi prepare |
| `running` | Attempt đã được nhận | AI giao/giám sát worker; trạng thái này tự nó không chứng minh process đang sống |
| `needs_review` | Result đã được submit | Reviewer đánh giá nội dung, tiêu chí và evidence |
| `accepted` | Output đã được nghiệm thu | Artifact có thể dùng; code có thể còn cần tích hợp |
| `integrated` | Có receipt tích hợp code đã xác minh | Task code phụ thuộc có thể lấy baseline phù hợp |
| `changes_requested` | Review yêu cầu sửa | AI nêu lý do, retry rõ ràng trước lần mới |
| `failed` | Attempt thất bại | AI kiểm tra nguyên nhân, không tự replay tác động chưa rõ |
| `cancelled` | Task đã hủy | Phụ thuộc chưa đủ vẫn bị chặn; hủy state không chứng minh agent đã dừng |

Hai gate quan trọng:

- `accepted`: phù hợp cho kết quả khảo sát hoặc contract đã được đánh giá.
- `integrated`: cần khi task code phải bắt đầu từ code của task code khác.

Code task phụ thuộc code task khác không được dùng gate `accepted` thay cho
`integrated`. Các commit phụ thuộc phải có baseline hợp lệ chứa đủ thay đổi;
runtime từ chối khi chưa xác định được baseline đó.

## 6. Điều phối nhiều task theo ngân sách worker phù hợp

AI chọn các task `ready` trong ngân sách đã xác định và prepare/giao việc cho từng agent. Khi một worker
trả kết quả, AI thu result, submit và đánh giá trạng thái mới. Nếu còn task độc lập
đủ đầu vào, AI có thể giao ngay mà không chờ tất cả worker trong nhóm đầu hoàn tất.

Nếu task kế tiếp phụ thuộc vào task vừa xong, phải qua đúng gate review hoặc
integration trước. Slot trống không cho phép bỏ qua phụ thuộc.

Thuật toán tự lấp slot đã được kiểm tra bằng fake workers. Trong sử dụng thực tế
hiện tại, **AI chính vẫn phải thực hiện vòng điều phối** qua prepare/submit và công cụ
agent được phiên hỗ trợ. Đóng phiên hoặc AI không hoạt động thì không có daemon
tự nhận task tiếp theo.

## 7. Quan sát và điều khiển

Dashboard đọc một file run JSON được chỉ định, chỉ mở trên loopback. Nó hiển thị
task, dependency, worker/worktree, attempt, output, validation, review và timeline.
Trang tự tải lại dữ liệu khoảng hai giây một lần khi hoạt động.

Dashboard hiện **chỉ đọc**: không có nút giao việc, kéo trạng thái, duyệt hoặc hủy.
Thay đổi trạng thái được AI/người điều phối ghi qua CLI. Nó không tự khám phá mọi
agent trong Codex và không phải màn hình xem toàn bộ terminal hoặc suy nghĩ riêng
của agent. Trạng thái và heartbeat là bằng chứng hoạt động đã được ghi nhận.

Có thể xem nhanh qua `status`, xem chi tiết qua `status --json`, hoặc yêu cầu AI
báo bảng task đang chạy, đầu ra đã đạt, blocker và bước tiếp theo.

## 8. Biện pháp giữ an toàn và quyền hạn

### Database

Trong các đợt cập nhật ECC này không truy cập hoặc sửa DB. Managed task hiện chỉ nhận
`permissions.database: "none"`, kể cả đọc. Không dùng MCP DB, migration, seed,
fixture/reset hoặc API có thể tác động DB để thực hiện các task này.

Worktree, packet và hướng dẫn agent không phải sandbox OS. Vì vậy public CLI và
module production không cho tự khởi chạy arbitrary worker process. Đường chạy
fake worker chỉ phục vụ Node-test harness rõ ràng, không phải cách kích hoạt thật.

Chính sách live/beta trước đây vẫn tồn tại cho nhiệm vụ khác được phép: live chỉ
đọc; beta mặc định chỉ đọc, ghi cần yêu cầu chủ động cụ thể. Tuy nhiên nó không
ghi đè lệnh cấm DB của nhiệm vụ hiện tại. Khi phát triển tính năng, BA xác định
hành vi mong muốn và code xác định luồng hiện hành; dữ liệu beta có thể bị sửa tay.

### Git và filesystem

- Worktree nằm ngoài source repo và được tạo từ commit đã pin.
- Mỗi attempt có vị trí riêng; không tự xóa evidence để giải quyết lỗi.
- Preflight từ chối một số đường dẫn nhạy cảm/DB, `.env.*` kể cả example/sample,
  symlink/submodule và Git filter driver có thể chạy lệnh khi checkout.
- Submit tự tính fingerprint và changed paths; không tin danh sách file worker tự khai.
- Explore/review task không được sửa file trong worktree.
- Lock tránh hai tiến trình đồng thời nhận cùng task; không tự phá lock chưa xác minh.
- `integrate` chỉ kiểm tra/ghi receipt của commit đã tồn tại, không commit/merge/push.

Các chốt này giảm sai sót; không biến metadata thành chứng nhận nội dung đúng.
Người/AI review vẫn phải đọc diff, truy vết tiêu chí và kiểm tra evidence thực.

### Quyền chạy test, commit và release

Approval plan không cấp mọi quyền chạy test hoặc xuất bản. Kiểm tra command và
target trước khi chạy. Một API test, app startup hoặc CI deploy có thể tác động
DB dù không có câu SQL trong lệnh gọi.

Chỉ thực hiện commit/push/deploy khi đã được giao phạm vi đó. Không yêu cầu lại
một quyền đã được cấp rõ, nhưng phải dừng phần phụ thuộc nếu nó mâu thuẫn lệnh cấm DB.

## 9. Phạm vi file thay đổi

| Khu vực | File chính | Nội dung |
|---|---|---|
| Hành vi cá nhân | [instructions.md](instructions.md) | Chọn quy trình vừa đủ, quyền hạn, bàn giao và giới hạn runtime |
| Lập kế hoạch | [ecc-plan](skills/ecc-plan/SKILL.md) | Task contract, DAG, baseline, gate và validation |
| Điều phối | [team-agent-orchestration](../skills/team-agent-orchestration/SKILL.md) | Quy trình và hướng dẫn runtime mới |
| Pipeline | [orch-pipeline](../skills/orch-pipeline/SKILL.md) | Liên kết vào cơ chế điều phối, bảo toàn quyền hạn |
| Code và kiểm tra | [tdd-workflow](../skills/tdd-workflow/SKILL.md), [verification-loop](../skills/verification-loop/SKILL.md) | Quy tắc managed handoff và evidence |
| Projection có sẵn | `.agents/skills/tdd-workflow/`, `.agents/skills/verification-loop/` | Đồng bộ phần sửa tương ứng |
| CLI | [orchestrate.js](../scripts/orchestrate.js) | init/status/approve/prepare/submit/review lifecycle/integrate/serve |
| State | [model.js](../scripts/lib/orchestration/model.js), [model-validation.js](../scripts/lib/orchestration/model-validation.js), [file-store.js](../scripts/lib/orchestration/file-store.js) | Transition, validation, JSON atomic write/lock |
| Thực thi | [handoff.js](../scripts/lib/orchestration/handoff.js), [worktrees.js](../scripts/lib/orchestration/worktrees.js), [runtime.js](../scripts/lib/orchestration/runtime.js) | Packet, fingerprint, Git receipt; scheduler fake-test |
| Quan sát | [dashboard.js](../scripts/lib/orchestration/dashboard.js), [dashboard-ui.js](../scripts/lib/orchestration/dashboard-ui.js), [control-pane.js](../scripts/control-pane.js) | Dashboard JSON chỉ đọc, tách đường SQLite cũ |

Thay đổi trực tiếp các skill upstream được thực hiện theo lựa chọn đã được người
dùng chấp thuận. Khi merge upstream, có thể cần xử lý conflict ở những file này.
Không có migration cho DB hiện có, không đổi MCP config hoặc hook Telegram.

## 10. Kiểm chứng đã có

Theo kết quả kiểm tra của đợt triển khai trước báo cáo:

- Bộ tổng hợp 50/50 test đạt; kiểm thử bổ sung ngoài Node-test context cũng đạt.
  Tổng số test liên quan sau bổ sung: 51.
- Scoped ESLint không báo lỗi/cảnh báo.
- Coverage đo ở bộ tổng hợp 50 test: 88,42% dòng, 81,16% nhánh trong các module
  orchestration và CLI được chọn. Không phải coverage toàn ECC hay ứng dụng nghiệp vụ.
- Có kiểm tra tranh claim giữa process, dependency, giới hạn ba slot, retry/late
  result, review identity, thay đổi sau submit, tích hợp Git và đường dashboard không nạp SQLite.
- Chỉ dùng fake workers, repo Git tạm và HTTP loopback trong kiểm thử.

Các con số trên là bằng chứng lịch sử của đợt triển khai 11/11, không phải kết quả
chạy lại hoặc tổng test mới của đợt 12/11. Chưa chứng minh một tính năng nghiệp vụ
cụ thể đã chạy trên beta. Kết quả kiểm tra cho cập nhật 12/11 được báo riêng khi có.

## 11. Phần có thể phát triển tiếp

Theo lựa chọn của người dùng ngày 12/11, các cải tiến bên dưới chỉ phục vụ thực thi
dưới sự điều phối của AI chính. Bộ điều phối độc lập tiếp tục công việc khi phiên
chính dừng không nằm trong định hướng triển khai, kể cả sau khi có sandbox.

1. Sandbox adapter được xác minh chặn DB, network và truy cập credential ngoài scope.
2. Nối launcher Codex/native agent thật vào task packet, lifecycle và cơ chế dừng.
3. Reviewer agent tự động nhưng vẫn bị ràng buộc acceptance/revision/output hash.
4. Recovery/reconciliation tốt hơn khi phiên chính hoặc worker bị ngắt.
5. Thao tác điều khiển trên dashboard, nếu sau này có nhu cầu và authorization phù hợp.

Đây là các khả năng tiếp theo, không phải chức năng đang bật. Hướng dẫn đi kèm chỉ
hướng dẫn phần dùng được hiện tại và phân biệt rõ các bước vận hành/release riêng.

## 12. Cập nhật ngày 12/11: chủ động gọi quy trình và giảm thao tác người dùng

### Hai điểm gọi cá nhân mới

| Phần mới | Ý nghĩa | Cách sử dụng |
|---|---|---|
| [ecc-work](skills/ecc-work/SKILL.md) | Điểm vào cho công việc; chọn cách làm vừa đủ và giữ quyền đã giao | `$ecc-work Lập kế hoạch tính năng trong [BA]` hoặc `$ecc-work Triển khai [yêu cầu]` |
| [ecc-view](skills/ecc-view/SKILL.md) | Đọc tiến độ nhiệm vụ/run đang làm, không thay đổi state | `$ecc-view` hoặc nói “Xem tiến độ” |

Sau khi cài profile có hai skill mới, mở phiên Codex mới để menu nhận diện chúng.
Không phải đọc lại một prompt bootstrap dài mỗi lần. `/view` chưa được tạo thành
slash command chung của Codex; skill và câu tự nhiên là những điểm vào được mô tả.

### Quyền chủ động và approval ngắn

Người dùng chọn `auto`, `direct` hoặc `team` cho nhiệm vụ bằng lời yêu cầu. `auto`
chọn quy trình vừa đủ; `direct` không chia agent; `team` yêu cầu AI tìm phần độc lập
để phân công, không bỏ qua dependency. Khi plan đã chốt, “Tôi đồng ý, hãy triển khai”
đủ để tiếp tục trong đúng phạm vi; không nhắc lại số worker hay quy tắc DB.

Không bật quy trình nặng cho mọi câu hỏi. JSON, packet, worktree, review receipt
và PowerShell là các bước AI quản lý, không phải bài thao tác bắt buộc của người dùng.
Điều phối vẫn thuộc phiên đang hoạt động, chưa phải daemon tự chạy nền.

### Worker budget và chi phí

Bỏ chính sách ba worker và kiểm tra trần tám của ECC. AI chọn ngân sách cụ thể,
giải thích ngắn khi cần; ngân sách này không cấp thêm slot cho host. Mười worker
có thể hợp lệ nếu có mười phần đủ độc lập, lợi ích về thời gian và môi trường hỗ trợ.
Nếu không, điều phối từng đợt và tái sử dụng slot. Token, disk và tải build/test
phải được cân nhắc; không tạo agent tối đa chỉ vì được phép.

### Bảng tiến độ và DB

Chat trả snapshot; dashboard tự đọc state khoảng hai giây một lần. Refresh không
gọi model. Dữ liệu chỉ thay đổi khi AI/công cụ ghi state; chưa có cơ chế thu mọi
hoạt động native agent liên tục. `ecc-view` không giả vờ có board khi nhiệm vụ
direct chưa tạo run và không tự chọn run mơ hồ.

Chính sách DB thường trực không đồng nghĩa cấm đọc trên mọi nhiệm vụ: live chỉ
đọc, beta mặc định chỉ đọc, ghi beta cần yêu cầu chủ động cụ thể. Với tính năng,
BA và code vẫn là căn cứ; DB chỉ bổ sung khoảng trống được xác định sau tìm nguồn.
Managed worker hiện giữ `database: "none"`; một read được phép phải do AI chính
xử lý ngoài worker, đúng project/môi trường và quyền của nhiệm vụ. Lệnh cấm mọi
DB riêng của đợt sửa ECC vẫn ưu tiên và tiếp tục được tuân thủ.

Hướng dẫn đã tách quickstart cho người dùng khỏi phụ lục vận hành PowerShell.
`run --execute` vẫn bị khóa; cập nhật này không kích hoạt tiến trình Codex tự động.

### Kiểm tra và cài đặt của đợt 12/11

- Bộ kiểm tra liên quan đạt **92/92**: setup, cài hai entry point, state model,
  JSON store, handoff CLI, dashboard và fake-worker/worktree.
- Scoped ESLint đạt, không có lỗi/cảnh báo. Không chạy lại bộ test DB của ECC.
- Đã chạy installer cá nhân; `ecc-work` và `ecc-view` là junction tới nguồn trong
  checkout. Kiểm tra dry-run sau cài báo `already current`.
- Test cài đặt dùng thư mục tạm, kiểm tra metadata/menu prompt, giữ các skill cũ
  và tính idempotent. Các scenario hành vi được lưu riêng để đánh giá; không coi
  file scenario là bằng chứng rằng mô hình đã chạy và vượt mọi tình huống.
- Review cuối đã làm rõ: yêu cầu `plan only` mới nhất được ưu tiên hơn quyền
  triển khai được cấp trước đó. Không mở rộng quyền khi người dùng đổi chế độ.

Mở phiên Codex mới để menu nhận hai skill. Chưa commit/push các cập nhật này;
không truy cập bất kỳ DB nào trong đợt thực hiện.

### Bổ sung: bắt buộc có AI chính điều phối

Đã ghi thành quy tắc thường trực trong bootstrap và skill: không kích hoạt daemon
tự làm việc khi AI chính không còn điều phối. Worker song song vẫn được dùng dưới
AI chính. Dừng có kiểm soát phải ngừng giao mới, yêu cầu dừng worker và lưu kết quả;
gián đoạn đột ngột cần kiểm tra lại trạng thái, không hứa có cơ chế tự kill process.
Dashboard chỉ đọc không phải ngoại lệ cho phép tự chạy task. Đây là lựa chọn thiết
kế của người dùng, không phải một tính năng chạy nền đang chờ được bật.

## 13. Cập nhật 16/11: hỏi về nghiệp vụ, AI tự chủ kỹ thuật

Theo làm rõ cuối cùng của người dùng, quy tắc áp dụng cho yêu cầu, đầu ra và luồng
nghiệp vụ chưa rõ/mâu thuẫn ở mọi nhiệm vụ, skill và giai đoạn. Nguồn có thể là
BA/Figma, tài liệu cũ, code/consumer cũ, contract, test hoặc quan sát thực tế.

Khi nghiệp vụ chưa rõ, AI trình bày bằng chứng, các cách hiểu và hệ quả rồi hỏi;
phần phụ thuộc phải chờ. Quyết định đã rõ được dùng tiếp, không hỏi lại.
Các phương án triển khai kỹ thuật, sửa chung/riêng, lựa chọn thư viện, thuật toán,
component và tương thích kỹ thuật để phục vụ đầu ra đã chốt do AI tự quyết định,
kiểm tra trong quyền được cấp và giải thích khi cần. Không hỏi chỉ vì các phương
án có chi phí/rủi ro kỹ thuật khác nhau. Chỉ đưa lại người dùng nếu có nghiệp vụ
chưa chốt, thay đổi đầu ra/phạm vi hoặc cần thêm quyền. Bản mở rộng trước đó buộc
hỏi mọi lựa chọn kỹ thuật đã được thay thế bằng ranh giới này.

Đã cập nhật bootstrap, ecc-work/ecc-plan, các quy tắc chọn kỹ thuật trong bug-plan/
bug-fix, tài liệu hướng dẫn và bộ đặc tả tình huống C1–C16. Kiểm tra
setup/cài skill đạt 38/38; kiểm tra liên kết đạt. Hai mô phỏng phản hồi cho tình
huống đầu ra đã rõ nhưng có nhiều phương án kỹ thuật và tình huống quy tắc thông
báo của luồng cũ chưa được chốt đều cho phản hồi phù hợp: tự chọn kỹ thuật ở trường
hợp đầu, hỏi về nghiệp vụ ở trường hợp sau. Đây là kiểm tra giới hạn, không phải
bảo đảm mọi lần mô hình đều tuân thủ.
Không sửa runtime, không truy cập DB và chưa commit/push đợt chỉnh chỉ dẫn này.

## 14. Cập nhật 17/11: đánh giá cách chia việc theo từng giai đoạn

- Phân biệt thứ tự phụ thuộc giữa các giai đoạn với cách làm bên trong mỗi giai
  đoạn. Lập plan tuần tự không mặc định kéo theo code/review tuần tự.
- AI đánh giá lại khi chuyển giai đoạn hoặc có đầu ra mới làm hết phụ thuộc;
  tự giao phần độc lập hữu ích trong quyền và slot thực tế, giữ yêu cầu không
  chia agent hoặc ranh giới giai đoạn người dùng đã đặt.
- Khi nói “tuần tự”, phải nêu giai đoạn/task, phụ thuộc/tài nguyên cụ thể và điều
  kiện mở bước tiếp theo; không chỉ thông báo một chế độ cho toàn bộ tính năng.
- Có bảng ngắn trong plan/handoff cho tính năng nhiều bước, gồm cả việc AI chính.
  Phân biệt dự kiến, chuẩn bị attempt, đã giao agent thật và đã nhận kết quả;
  chúng là các mức bằng chứng trong báo cáo, không phải trạng thái JSON mới.
- `classifyWork`/CLI nhận `phase` tùy chọn cho một lần đánh giá, giữ tương thích
  với đầu vào cũ. Nhãn này không tự khám phá task, lưu phase vào run hay khởi
  chạy agent. Chỉ dẫn yêu cầu AI chính thực hiện việc đánh giá lại và điều phối.
- Ở thời điểm cập nhật giai đoạn này, URL/mở dashboard và sửa UI được hoãn; phần
  triển khai tiếp theo ở mục 15 thay thế giới hạn đó. Trạng thái `Running` sau claim chưa chứng
  minh có native agent hoạt động; AI phải đối chiếu bằng chứng dispatch thay vì
  diễn giải nó thành số worker thực đang chạy.

Tham khảo [quy tắc theo giai đoạn](references/phase-coordination.md) và
[các tình huống đánh giá](tests/phase-coordination.scenarios.md). Bộ setup/cài skill
và CLI đạt 47/47 test; ba test mới bao phủ chuyển mode theo phase, kiểm tra nhãn
và CLI roundtrip. Scoped ESLint và diff check đạt, review không thấy blocker.
File scenario là đặc tả đánh giá, không phải kết quả mô hình đã vượt toàn bộ case.
Không truy cập DB, không khởi động dashboard và chưa commit/push đợt cập nhật này.

## 15. Dashboard quan sát thực thi kế hoạch (lịch sử; đã tạm bỏ ở mục 16)

Đợt này bổ sung sổ quan sát để người dùng xem cách AI chính điều phối và thực hiện
kế hoạch, không chỉ danh sách task kết thúc/chưa kết thúc. Đây là khả năng quan sát
dưới sự giám sát của AI chính, không phải bộ điều phối chạy độc lập.

### Cách dùng từ tính năng tiếp theo

1. Dùng `$ecc-work` cùng tài liệu/mục tiêu như bình thường. Với tính năng nhiều bước,
   AI bắt đầu observation run từ lúc tiếp nhận, kể cả đang plan tuần tự.
2. AI ghi plan/phiên bản, việc của chính mình và agent, giai đoạn, lý do chia việc,
   phụ thuộc, kết quả và thay đổi sau các mốc thực tế. Bạn không gõ từng lệnh nội bộ.
3. Gọi `$ecc-view` trong phiên đang làm. AI xác định run, dùng CLI `view` để mở/tái
   sử dụng server thụ động và đưa URL đã được kiểm tra. Trang nằm trong browser riêng.

### Thành phần mới và ý nghĩa

| Thành phần | Ý nghĩa |
|---|---|
| `observe-init <manifest.json> --state <run.json>` | Bắt đầu sổ quan sát JSON với execution tasks rỗng, không cần giả lập một task chạy thật |
| `record --state <run.json> --event <event.json>` | Ghi mốc có evidence; không cấp quyền thực hiện hoặc tự gọi agent |
| `view --state <run.json>` | Lấy URL của server chỉ đọc đã xác minh; không tự mở browser hoặc làm việc thay AI |
| Observation plan/work items | Phân biệt kế hoạch, phần việc AI chính/agent, giai đoạn và phụ thuộc |
| Phase decisions | Lưu chọn tuần tự/song song và lý do, thay vì một nhãn cố định cho cả tính năng |
| Dispatch receipt | Lưu provider/tool/agent reference thật sau khi đã giao việc; tách khỏi chuẩn bị packet |
| Attempts/results/reviews/changes | Đối chiếu kết quả với lần thực hiện, output và lịch sử sửa/đổi plan |

Dashboard đọc lại trạng thái khoảng hai giây và không gọi model cho mỗi lần làm
mới. Trang thể hiện observation do AI chính ghi kèm reference, không tự thu hoặc
xác thực mọi hoạt động native agent. Receipt đã giao không chứng minh process còn
sống; trạng thái cũ/thiếu evidence phải được nêu rõ. Không tự tạo phần trăm, ETA
hoặc điểm chất lượng từ số lượng task. Việc nhỏ có thể giữ báo cáo trong hội thoại.

Observation review/integration là receipt được ghi nhận; không tự thay thế các
execution gate kiểm tra worktree/Git hiện có. Sổ quan sát không tạo worker, sửa
source, chạy test hay commit/merge/push. `run --execute` vẫn khóa và mọi quyền DB,
chạy ứng dụng/test, bug-stage và publication trước đây vẫn được giữ.

Quy trình chi tiết cho AI/người muốn kiểm tra kỹ thuật:
[dashboard-observation.md](references/dashboard-observation.md). Người dùng không
cần thao tác các event thủ công. Run không xác định phải được báo thiếu dữ liệu,
không tạo một lịch sử giả để hiển thị dashboard. Các con số ở mục trước thuộc
những lần kiểm tra trước.

### Kiểm chứng của đợt triển khai

Bộ kiểm tra liên quan có 127 test: 126 đạt, không có test lỗi, một test bỏ qua do
Windows thiếu quyền tạo file symlink. Phạm vi gồm 38 test setup/cài skill và các
test orchestration CLI, model, store, dashboard, launcher, runtime và worktree.
Scoped ESLint trên các file JavaScript thay đổi đạt; review cuối không còn blocker.
Riêng ba module observation mới đạt 99,53% line coverage và 92,89% branch coverage
trong lần chạy đo coverage với 13 test observation đều đạt.

Đã khởi chạy dashboard thật, kiểm tra HTTP health và mở trang bằng trình duyệt
với run chứa các mốc thực tế của đợt triển khai. Đây là xác minh trong môi trường
hiện tại, không phải chứng nhận toàn bộ bộ test ECC hoặc mọi trình duyệt/kích
thước màn hình. Đã kiểm tra viewport desktop 1440px và mobile giả lập 375px:
không tràn ngang; trang nhận các mốc mới mà không cần tải lại thủ công.
Không truy cập DB, chưa commit hoặc push đợt dashboard này.

## 16. Tạm bỏ dashboard; giữ nguyên cách AI làm việc

Theo yêu cầu mới, dashboard trình duyệt không còn là phần đang sử dụng. AI không
tự chạy server, tạo observation run hoặc ghi event riêng chỉ để theo dõi. ecc-view
trả bảng tiến độ ngắn trong hội thoại. Các hướng dẫn bật trang ở mục 15 là lịch
sử triển khai, không phải quy trình hiện hành. Mã thử nghiệm và dữ liệu cũ được
giữ để nghiên cứu sau; bật lại cần yêu cầu rõ, không suy từ câu “xem tiến độ”.

Giữ nguyên lập kế hoạch theo code/yêu cầu đã chốt, hỏi khi nghiệp vụ chưa rõ,
tự quyết kỹ thuật, đánh giá song song theo từng giai đoạn, số worker phù hợp và
refill khi đủ điều kiện, ownership/worktree, dependency gate, review và lưu attempt
cần cho điều phối/khôi phục. Không bỏ execution state thực sự cần dùng. AI chính
vẫn điều phối; không thêm bộ chạy nền. Quyền DB, test, commit/push/deploy giữ nguyên.

Đã cập nhật bootstrap, ecc-work/ecc-plan/ecc-view, metadata ecc-view, tài liệu
phase coordination, README và hướng dẫn sử dụng; đánh dấu tài liệu dashboard là
tham khảo đã tạm dừng. Không cần cài lại các skill đang được liên kết.

Kiểm tra setup/cài skill đạt 38/38; rà soát độc lập phát hiện một ví dụ khởi chạy
control pane còn sót trong README và đã loại bỏ. Đã dừng tiến trình dashboard
của đợt triển khai sau khi đối chiếu instance/PID qua health endpoint. Giữ nguyên
dữ liệu cũ; không truy cập DB, chưa commit hoặc push lần chỉnh này.
