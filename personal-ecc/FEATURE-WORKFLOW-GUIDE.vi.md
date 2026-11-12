# Hướng dẫn bắt đầu tính năng mới với ECC

Phiên bản hướng dẫn: 12/11/2026. Dành cho người dùng Codex đang dùng checkout ECC này.

Đọc cùng [Báo cáo cập nhật](ORCHESTRATION-REPORT.vi.md) nếu cần biết phạm vi kỹ thuật.
Các lệnh dưới đây là hướng dẫn, chưa được chạy vào project nghiệp vụ của bạn.

## 1. Bắt đầu bằng hai skill ngắn

**Quy tắc thường trực: mọi công việc phải có AI chính điều phối.** Không bật
chương trình độc lập tự tiếp tục phát triển khi phiên AI chính dừng. Worker vẫn
được làm song song dưới sự điều phối đó. Khi dừng có kiểm soát, AI ngừng giao việc,
yêu cầu worker dừng và lưu trạng thái; nếu mất kết nối đột ngột thì phải xác minh
worker còn chạy hay không khi tiếp tục, không mặc định chúng đã tự tắt.
Dashboard chỉ đọc có thể còn hiển thị; nó không được tự thực hiện công việc.

Trong phiên Codex mới, mở đúng project nghiệp vụ rồi gõ `$` để chọn:

| Bạn cần làm gì | Cách gọi | AI làm gì |
|---|---|---|
| Nhận một tính năng/công việc mới | `$ecc-work` và yêu cầu/tài liệu BA | Chọn quy trình vừa đủ, giữ phạm vi và tổ chức thực hiện |
| Xem tiến độ công việc đang làm | `$ecc-view` | Xác định run đang nói tới, đọc trạng thái và tóm tắt; đưa đường dẫn dashboard nếu có |
| Chỉ lập kế hoạch | `$ecc-plan` và yêu cầu | Khảo sát, trả plan rồi dừng theo phạm vi đã giao |

Ví dụ thông thường:

```text
$ecc-work Lập kế hoạch tính năng trong tài liệu [đường dẫn BA].
```

Sau khi đã chốt kế hoạch, bạn chỉ cần nói:

```text
Tôi đồng ý, hãy triển khai.
```

AI kế thừa kế hoạch, quyền đã cấp và quy tắc thường trực; không bắt bạn nhắc lại
bootstrap, số worker hay chính sách DB. Nếu ngay từ đầu bạn đã giao triển khai,
skill không tự chèn thêm một vòng xin phép chỉ vì tên quy trình có bước lập plan.

Bạn có thể chủ động đổi cách làm cho từng nhiệm vụ:

| Lựa chọn | Câu ngắn có thể dùng | Hành vi |
|---|---|---|
| `auto` | “Tự chọn cách làm phù hợp.” | Việc nhỏ trực tiếp, phần phụ thuộc tuần tự, phần lớn độc lập mới song song |
| `direct` | “Việc này làm trực tiếp, không chia agent.” | Không tạo worker/board/worktree chỉ để làm thủ tục |
| `team` | “Chia agent cho những phần độc lập.” | AI xác minh tính độc lập rồi điều phối trong khả năng thực tế |

Đây là lựa chọn trong lời yêu cầu/skill, không phải cú pháp slash command mới.
`team` không biến các bước phụ thuộc thành độc lập; nếu chưa thể chia, AI giải thích
và tiếp tục phần có thể làm. Chế độ chỉ áp dụng cho công việc đang được giao,
không âm thầm bật vĩnh viễn cho mọi câu hỏi sau này.

Không có giới hạn mặc định cố định ba worker. AI chọn ngân sách worker dựa trên
task độc lập, slot công cụ thật sự khả dụng và tải máy. Có thể dùng mười worker
khi hữu ích và môi trường hỗ trợ; nếu thiếu slot, xếp hàng rồi giao tiếp khi trống.
Không hứa số worker vượt giới hạn host và không tạo agent chỉ để lấp đầy slot.

Bạn không phải tự tạo JSON, copy hash hay nhập lệnh PowerShell. **Phần 4–9 là
phụ lục vận hành tùy chọn dành cho AI/người muốn kiểm tra kỹ thuật**, không phải
các bước bắt buộc trước khi sử dụng Codex. Các ví dụ managed run trong phụ lục
vẫn giữ `permissions.database: "none"`, đúng khả năng runtime hiện tại.

### Quy tắc DB được nhớ như thế nào?

- Live luôn chỉ đọc; beta mặc định chỉ đọc. Ghi beta cần yêu cầu chủ động, cụ thể
  của bạn về bản ghi/thay đổi, không phát sinh từ câu “đồng ý triển khai”.
- Khi làm tính năng: BA xác định hành vi mong muốn, code xác định luồng hiện tại;
  dữ liệu beta có thể bị sửa tay và không trở thành quy tắc nghiệp vụ/test oracle.
- Đọc DB là ngữ cảnh cuối cùng cho khoảng trống cụ thể sau khi đã tìm trong code,
  config, enum, migration/seed, test và tài liệu; phải xác định đúng project/MCP/môi trường.
- Managed JSON worker hiện chỉ hỗ trợ `database: "none"`. Nếu nhiệm vụ cho phép
  một read cần thiết, AI chính xử lý evidence đó ngoài worker theo chính sách thường trực;
  không sửa permission hoặc packet để worker vượt giới hạn.
- Nếu nhiệm vụ có lệnh cấm mọi truy cập DB, lệnh đó được ưu tiên cả với AI chính.
  Đợt cập nhật ECC này vẫn không truy cập bất kỳ DB nào.

Đồng ý code không tự cấp quyền commit, push hoặc deploy ngoài phạm vi đã giao.
AI không hỏi lại quyền đã được cấp rõ, nhưng phải giữ các giới hạn còn hiệu lực.

### Token và tài nguyên máy

Nhiều worker có thể giảm thời gian nhưng tăng token do mỗi agent cần ngữ cảnh và
trao đổi kết quả. Worktree dùng dung lượng đĩa; dashboard dùng một tiến trình Node
và trình duyệt. Build/test/dev server chạy đồng thời mới thường là phần có thể
gây tải CPU/RAM/I/O đáng kể. AI phải hạn chế các job nặng theo điều kiện thực tế,
không tự đưa số RAM hoặc phần trăm tiết kiệm chưa đo. Làm trực tiếp cho việc nhỏ
giúp tránh chi phí điều phối không cần thiết.

## 2. Chuẩn bị trước khi gửi yêu cầu

### 2.1. Mở đúng project và đúng nguồn skill

Mở phiên Codex mới trong project nghiệp vụ bạn muốn sửa. Checkout ECC là nguồn
công cụ/hướng dẫn; `repoRoot` trong plan là project nghiệp vụ, không mặc định là ECC.

Bootstrap và kiểm tra nguồn hướng dẫn là trách nhiệm khởi đầu của AI, không phải
prompt dài bạn phải gửi lại. `$ecc-work` đọc nguồn Personal ECC trong checkout
được bootstrap chỉ định và không lấy bản plugin cache cũ thay phần đã sửa.

Sau khi cài hai skill mới, mở phiên Codex mới để menu nhận diện chúng. Skill đã
sửa trên disk không chứng minh mọi plugin cache đã tự đồng bộ. Nếu menu/nội dung
không khớp, bạn có thể nói “Kiểm tra nguồn skill ECC”. Nếu phiên không có công cụ
agent, AI báo rõ và làm tuần tự trong khả năng có sẵn; không giả vờ đã tạo worker.

### 2.2. Chuẩn bị thông tin từ BA

| Đầu vào | Ví dụ thông tin cần có |
|---|---|
| Tài liệu BA | Đường dẫn Markdown/PDF/doc, ticket hoặc nội dung yêu cầu |
| Mục tiêu | Ai sử dụng, cần đạt kết quả gì |
| Luồng chính | Các bước thao tác và điều kiện trước/sau |
| Quy tắc | Quyền, giới hạn, trạng thái, lỗi cần trả |
| UI/API | Design, contract hoặc điểm còn cần chốt |
| Acceptance criteria | Các điều kiện có thể kiểm tra được |
| Phạm vi | Backend/frontend/module; phần không thay đổi |
| Môi trường | Branch đích, môi trường kiểm tra, cách bàn giao beta |
| Quyền thực thi | Chỉ lập plan, được code, được chạy test nào, commit/push/deploy hay chưa |

Thông tin thiếu chưa chắc chặn mọi việc. AI có thể khảo sát code độc lập trong
khi chờ BA trả lời, nhưng không tự quyết định một quy tắc nghiệp vụ quan trọng.

### 2.3. Prompt khởi động có thể dùng ngay

Prompt ngắn thông thường là đủ:

```text
$ecc-work Lập kế hoạch tính năng [mục tiêu] từ [BA/ticket] trong project này.
```

Hoặc, khi muốn giao luôn thực hiện trong phạm vi đã rõ:

```text
$ecc-work Triển khai tính năng theo tài liệu [đường dẫn], tự chọn cách làm phù hợp.
```

Chỉ bổ sung những quyền/giới hạn khác với nhiệm vụ trước, chẳng hạn “chỉ lập plan”,
“không chia agent” hoặc “được chạy nhóm unit test đã xác minh”. Không cần chép lại
quy tắc DB thường trực. Tên hiển thị skill có thể có tiền tố plugin; chọn đúng skill
trong menu và xác minh nguồn khi có dấu hiệu không khớp.

## 3. Nhận BA → khảo sát code → chốt kế hoạch

### Bước 1: AI làm rõ yêu cầu

Bạn cần nhận được danh sách tiêu chí như `AC-01`, `AC-02`, kèm điểm chưa rõ.
Ví dụ với đăng ký lịch thi: ai được đăng ký, điều kiện đủ chỗ, xử lý đăng ký trùng,
thông báo lỗi và quyền xem lịch. Đây là ví dụ, không phải nghiệp vụ được mặc định.

Đầu ra cần phân biệt yêu cầu BA, hành vi hiện có và giả định cần xác nhận.

### Bước 2: Khảo sát những phần có thể độc lập

| Người thực hiện | Phần việc | Đầu ra cần đọc được |
|---|---|---|
| AI chính | Tổng hợp BA, giữ phạm vi | AC, câu hỏi, quyết định và giới hạn quyền |
| Explorer backend | Route → service → model/query → response | File/hàm, nhánh xử lý và consumer liên quan |
| Explorer frontend | Screen → form → API client → state | Component, validation, route và điểm tích hợp |
| Explorer test, nếu cần | Test/fixture và command đang có | Cách kiểm tra phù hợp; command nào có tác động DB |

Đây là các vai trò, không bảo đảm có sẵn agent mang đúng tên. AI chọn công cụ
agent phiên hỗ trợ. Với managed `prepare`, cả explorer cũng có worktree riêng.
Explorer chỉ đọc: không viết báo cáo trong worktree; trả findings qua result summary.

Bạn có thể gọi ngắn:

```text
$ecc-view
```

Bảng trong câu trả lời là snapshot tại lúc trả lời, không tự thay đổi sau đó.
Dashboard trình duyệt tự đọc lại state khoảng hai giây; chỉ phản ánh những sự kiện
AI/công cụ đã ghi, chưa tự thu mọi hoạt động native agent. Refresh không gọi model
mỗi hai giây và không phát sinh token mô hình cho mỗi lần tải trang. `/view` chưa
được cài thành slash command; dùng `$ecc-view` hoặc nói “Xem tiến độ”. Nếu có nhiều
run phù hợp mà chưa rõ bạn muốn run nào, AI hỏi chọn thay vì tự mở nhầm.

### Bước 3: Chốt contract trước khi cho code song song

Backend/frontend chỉ song song khi đã rõ request, response, lỗi, quyền và cách
mock contract. Nếu frontend còn phải chờ backend quyết định schema thì task đó
chưa độc lập. Shared contract và file chung do AI chính quản lý.

Kế hoạch cần chỉ ra:

- Scope backend và frontend không chồng nhau.
- Cách dùng mock theo contract để frontend không cần gọi API/DB thật.
- Tác động tới các consumer hiện có.
- Task nào đợi artifact `accepted`, task nào đợi code `integrated`.
- Test nào chỉ viết, test nào được phép chạy và target không DB.
- Đầu ra nào còn `not-run`; ai chạy và cung cấp evidence sau đó.

### Bước 4: Bạn giao phạm vi triển khai

Ví dụ:

```text
Tôi đồng ý, hãy triển khai.
```

AI hiểu câu này trong ngữ cảnh kế hoạch đã chốt, tự quản lý worker/state và kế thừa
quyền cùng các giới hạn đang có. Không cần nhắc lại số worker hay chính sách DB.
Nếu cho phép thêm test/publication ngoài phạm vi cũ, nêu phạm vi đó một lần; AI
không cần hỏi lại từng thao tác bên trong phạm vi đã được cấp.

## Phụ lục vận hành tùy chọn: phần 4–9 dành cho AI hoặc người muốn thao tác tay

Các lệnh sau không phải cách bật chế độ AI và không bắt buộc chạy trước khi vào
Codex. Bình thường AI thực hiện chúng qua công cụ của phiên, bạn chỉ xem tiến độ
và quyết định nghiệp vụ/quyền hạn. Không có daemon tự tiếp tục khi phiên AI dừng.

## 4. Chuẩn bị thư mục và terminal

Ví dụ minh họa trên Windows; thay đường dẫn bằng project thực tế. Không chạy vào
một repo chỉ vì tên giống ví dụ. Các biến bên dưới không sửa cấu hình hệ thống.

Khuyến nghị dùng PowerShell 7.3 trở lên (`pwsh`), đặc biệt khi truyền JSON cho chương trình
Node qua `--command`; Windows PowerShell 5 có cách truyền dấu nháy khác. Nếu thấy
`Invalid command JSON`, kiểm tra shell/argument trước, không chỉnh tay run state.
Mở PowerShell tại checkout ECC:

```powershell
Set-Location 'C:/ECC'
$EccRoot = (Get-Location).Path
$RepoRoot = 'C:/work/my-app'
$RunDir = 'C:/ecc-runs/exam-registration'
$WorktreeRoot = 'C:/ecc-worktrees'
$PlanFile = Join-Path $RunDir 'plan.json'
$RunFile = Join-Path $RunDir 'run.json'
$Orchestrator = Join-Path $EccRoot 'scripts/orchestrate.js'

Get-Command node, git
git -C $RepoRoot status --short
New-Item -ItemType Directory -Path $RunDir -Force | Out-Null
```

Nếu `node` không có trong PATH, dùng đường dẫn executable Node đã cài ở máy bạn.
Với PowerShell, gọi executable có đường dẫn bằng `& 'đường-dẫn-node.exe' ...`.
Không cài package hoặc đọc credential chỉ để kiểm tra các công cụ này.

Thư mục dự kiến:

```text
ECC checkout/
  scripts/orchestrate.js          công cụ dùng chung

project nghiệp vụ/                checkout tích hợp, do AI chính quản lý

ecc-runs/exam-registration/
  plan.json                      plan do AI chuẩn bị để review
  run.json                       state do CLI quản lý; không sửa tay
  run.json.artifacts/...         packet theo attempt
  BE-01-1.result.json             result thu từ worker, ngoài worktree

ecc-worktrees/
  exam-registration-BE-01-1/     checkout riêng của một attempt
  exam-registration-FE-01-1/
```

Không ghi token, dữ liệu khách hàng hoặc log chứa secret vào plan/result. Không
commit state/packet vào source chỉ để theo dõi tiến độ. Giữ các file này trong
vùng lưu trữ nội bộ phù hợp vì chúng có thể chứa đường dẫn và thông tin công việc.

Code chưa commit trong checkout gốc không tự xuất hiện ở worktree mới. Trước khi
pin baseline, AI phải kiểm tra thay đổi đang có và tránh ghi đè công việc khác.

## 5. Tạo một plan thực thi cụ thể

AI chỉ tạo JSON run khi công việc thật sự cần quản lý như vậy. Sau khảo sát và
chốt API contract, đây là ví dụ **plan triển khai** ba task. Các scope chỉ minh
họa; phải thay bằng đường dẫn thật đã xác minh trong repo của bạn.

Lưu JSON này thành `$PlanFile` bằng editor UTF-8:

```json
{
  "schemaVersion": 1,
  "id": "exam-registration",
  "repoRoot": "C:/work/my-app",
  "baseRef": "HEAD",
  "approved": false,
  "maxWorkers": 2,
  "tasks": [
    {
      "id": "BE-01",
      "title": "Implement registration backend against approved contract",
      "kind": "code",
      "scope": ["backend/src", "backend/tests"],
      "dependsOn": [],
      "inputs": ["approved-ba-v1#AC-01", "approved-api-contract-v1"],
      "acceptance": ["Backend follows approved contract and AC-01"],
      "validation": ["backend-unit"],
      "permissions": { "database": "none", "executeTests": false }
    },
    {
      "id": "FE-01",
      "title": "Implement registration UI with contract mocks",
      "kind": "code",
      "scope": ["frontend/src", "frontend/tests"],
      "dependsOn": [],
      "inputs": ["approved-ba-v1#AC-02", "approved-api-contract-v1"],
      "acceptance": ["UI follows approved contract and AC-02"],
      "validation": ["frontend-unit"],
      "permissions": { "database": "none", "executeTests": false }
    },
    {
      "id": "QA-01",
      "title": "Add integration checks using isolated mocks",
      "kind": "code",
      "scope": ["tests/integration"],
      "dependsOn": [
        { "taskId": "BE-01", "gate": "integrated" },
        { "taskId": "FE-01", "gate": "integrated" }
      ],
      "inputs": ["approved-ba-v1", "approved-api-contract-v1"],
      "acceptance": ["Integration cases cover the approved registration flow"],
      "validation": ["integration-mocked"],
      "permissions": { "database": "none", "executeTests": false }
    }
  ]
}
```

BE và FE độc lập vì đã có contract, FE dùng mock. QA phải đợi cả hai được tích hợp.
Ngân sách hai slot trong ví dụ được chọn vì chỉ có BE và FE đang độc lập; đây
không phải mặc định toàn hệ thống. AI phải chọn lại theo công việc và slot host
khả dụng. Có thêm slot cũng không khiến QA được chạy trước dependency gate.

`executeTests: false` nghĩa worker chỉ viết test. Các tên trong `validation` là
tên bằng chứng cần thu, **không phải lệnh CLI tự chạy**. Chưa có kết quả thực thì
chưa thể nghiệm thu `approved` theo plan này. Người dùng có thể tự chạy nhóm test
đã kiểm tra không DB và cung cấp kết quả để reviewer đánh giá.

`inputs` trong ví dụ là tham chiếu do người điều phối quản lý; trước khi giao việc
phải có tài liệu thật và phiên bản cụ thể. CLI không tự biến chuỗi này thành tài liệu.

Nếu muốn quản lý cả khảo sát, có thể tạo run khảo sát riêng với `kind: "explore"`,
`validation: []` và tiêu chí trả findings. Sau đó tạo plan triển khai mới dựa trên
findings đã nghiệm thu. CLI hiện không có command sửa/append plan task sau init;
không chỉnh tay run state để đổi scope hoặc dependency.

## 6. Khởi tạo, ghi approval và mở dashboard

### 6.1. Khởi tạo

```powershell
node $Orchestrator init $PlanFile --state $RunFile
node $Orchestrator status --state $RunFile
node $Orchestrator run --state $RunFile
```

`init` pin `baseRef` thành commit SHA và không ghi đè run đã tồn tại. Dù plan có
`approved: true`, CLI vẫn nhập về trạng thái chưa approval. `run` chỉ preview;
không tạo worker, không tự code và không tạo worktree.

### 6.2. Ghi nhận approval đã có

Sau khi bạn đã giao phạm vi triển khai, AI ghi nhận bằng chứng đó:

```powershell
node $Orchestrator approve --state $RunFile --by 'project-owner' --evidence 'Owner approved implementation of plan v1; no DB; no test execution; no publication'
```

Đây là ghi lại quyền đã được cấp, không phải AI tự phê duyệt thay bạn. Không dùng
chuỗi ví dụ làm bằng chứng nếu bạn chưa thực sự chấp thuận nội dung tương ứng.

### 6.3. Mở dashboard trong terminal thứ hai

Các biến của terminal thứ nhất không tự tồn tại trong terminal thứ hai. Điền lại
đường dẫn hoặc dùng trực tiếp:

```powershell
Set-Location 'C:/ECC'
node scripts/orchestrate.js serve --state 'C:/ecc-runs/exam-registration/run.json' --port 8765
```

Mở URL mà terminal in ra, thường là `http://127.0.0.1:8765`. Giữ terminal này hoạt
động để phục vụ trang; `Ctrl+C` dừng dashboard, không dừng các agent đang làm việc.

Cách tương đương qua control pane:

```powershell
node scripts/control-pane.js --orchestration 'C:/ecc-runs/exam-registration/run.json' --no-open
```

**Phải có `--orchestration`** nếu dùng control pane trong nhiệm vụ không DB. Bỏ
flag này sẽ đi vào chế độ control pane cũ dùng các kho DB ECC, ngoài phạm vi này.

Dashboard tự refresh khoảng hai giây, chỉ đọc file JSON. Nó không cung cấp nút
pause/retry/review và không tự thu toàn bộ log của native agent.

## 7. Giao worker và nhận kết quả

### 7.1. Prepare task đang ready

Trong terminal thứ nhất hoặc để AI làm:

```powershell
node $Orchestrator prepare --state $RunFile --task 'BE-01' --worker 'backend-worker-1' --worktree-root $WorktreeRoot
node $Orchestrator prepare --state $RunFile --task 'FE-01' --worker 'frontend-worker-1' --worktree-root $WorktreeRoot
```

CLI trả `taskId`, `attemptId`, `workerId`, `worktree`, `baseline`, `packetFile`.
Lưu các giá trị thật. `prepare` ghi claim, tạo worktree và packet; nó không khởi
chạy Codex. Nếu prepare lỗi sau claim, attempt được ghi failed để kiểm tra/retry.

Preflight có thể từ chối repo có tracked `.env.*` kể cả template, file mang tên
DB/credential, symlink/submodule hoặc Git filter driver. Báo lý do và giữ trạng
thái; không xóa/bỏ qua chốt an toàn để ép chạy. Có thể tiếp tục phần khảo sát
được phép theo cách khác và nêu rõ phần chưa được managed runtime bảo vệ.

### 7.2. AI giao packet cho agent thật

AI chính dùng công cụ agent của phiên hoặc cơ chế bàn giao đã được hỗ trợ.
Không có command trong CLI này tự kết nối một native agent vào packet.

Nội dung bàn giao mẫu:

```text
Bạn nhận task BE-01, attempt [giá trị prepare trả về].
Đọc packet tại [packetFile], làm việc trong [worktree], baseline [SHA].
Bạn chỉ sở hữu [scope chính xác]. Không sửa checkout gốc hoặc file của worker khác.
Bạn không làm việc một mình; giữ nguyên thay đổi của người khác và phối hợp qua AI chính.

Đọc tài liệu BA/contract [đường dẫn + phiên bản thật] và đầu ra upstream đính kèm.
Không truy cập DB/MCP DB, không migration/seed/API thật; không test/commit/push/deploy
ngoài quyền đã cấp. Không đổi HEAD, tự commit hoặc tích hợp code trong worker tree.

Nếu cần sửa ngoài scope hoặc contract có vấn đề, trả blocker cho AI chính.
Kết quả phải nêu thay đổi, AC đã đáp ứng, evidence, checks đã chạy/chưa chạy.
Trả result JSON đúng runId/taskId/attemptId; lưu ngoài worktree theo đường dẫn được giao.
```

Với explorer/reviewer, bổ sung “chỉ đọc; không tạo/sửa file trong worktree”.
Đừng tạo agent bằng cách chạy tùy ý `codex exec` rồi cho rằng đã có sandbox.
`run --execute` đang bị chặn có chủ đích; không dùng test harness để vượt chặn.

### 7.3. Thu result

Ví dụ result chưa chạy test, lưu ở `$RunDir/BE-01-1.result.json`:

```json
{
  "runId": "exam-registration",
  "taskId": "BE-01",
  "attemptId": "BE-01-1",
  "summary": "Implemented the approved backend flow; tests written, not executed",
  "checks": [
    { "name": "backend-unit", "status": "not-run", "evidence": "Execution not authorized; test cases prepared" }
  ],
  "artifacts": []
}
```

Chỉ ghi `passed` khi có lần chạy thật cùng command, target, revision và kết quả
đủ kiểm chứng. Artifact là tham chiếu, không phải quyền ghi file hoặc bằng chứng
rằng nội dung đã được runtime đọc/xác minh. Đưa findings đủ rõ vào summary và
truyền tài liệu ngoài worktree bằng cơ chế đã được chấp thuận nếu cần.

### 7.4. Submit

```powershell
$ResultFile = Join-Path $RunDir 'BE-01-1.result.json'
node $Orchestrator submit --state $RunFile --task 'BE-01' --attempt 'BE-01-1' --result $ResultFile
node $Orchestrator status --state $RunFile
```

CLI xác minh identity, HEAD, fingerprint và changed paths. Code vượt scope hoặc
read-only task sửa file sẽ bị từ chối; không dùng generic `dispatch claim/submit`
để bỏ qua bước này. Kết quả hợp lệ chuyển sang `needs_review`, chưa phải accepted.

## 8. Review, yêu cầu sửa và tích hợp

### 8.1. AI chính tổ chức review

Reviewer phải khác worker thực hiện task, đọc đúng diff và đánh giá đủ AC. Hiện
CLI chỉ ghi nhận danh tính và evidence; nó không xác minh một người/agent là ai
bằng đăng nhập và không tự chạy reviewer. Đổi tên worker thành reviewer không
tạo ra review độc lập thực chất.

Prompt yêu cầu review:

```text
Hãy review task [id], attempt [id], đúng revision và outputHash hiện tại.
Đối chiếu BA/contract và toàn bộ acceptance criteria, đọc diff, kiểm tra phạm vi,
consumer liên quan và tính xác thực của validation evidence. Chỉ đọc, không DB.
Nêu findings theo mức độ; chưa chạy test thì ghi rõ, không kết luận đã pass.
```

Lấy snapshot để đối chiếu:

```powershell
$Snapshot = node $Orchestrator status --state $RunFile --json | ConvertFrom-Json
$Task = $Snapshot.tasks | Where-Object { $_.id -eq 'BE-01' }
$Task.output
$Task.acceptance
```

Với mẫu result `not-run`, không ghi `approved` khi validation bắt buộc chưa đạt.
Người dùng cần chạy test đã xác minh không DB và cung cấp evidence. Nếu đã submit,
không sửa tay output: reviewer ghi `changes_requested` với lý do thiếu kiểm chứng,
sau đó retry và thu một result mới có evidence hợp lệ. Lần retry phải giữ lại code
cũ để đọc/chuyển có kiểm soát; worktree mới không tự copy thay đổi chưa tích hợp.

### 8.2. Ghi review sau đánh giá thực

Ví dụ bên dưới chỉ dùng **sau khi reviewer thật đã kết luận approved và mọi check
bắt buộc đã passed**. Điền evidence thật, không dùng câu mẫu như kết quả kiểm chứng.

```powershell
$Review = @{
  action = 'review'
  taskId = $Task.id
  attemptId = $Task.currentAttemptId
  revision = $Task.output.revision
  outputHash = $Task.output.outputHash
  verdict = 'approved'
  reviewer = 'independent-reviewer-1'
  evidence = '[Real review findings and validation evidence references]'
  criteria = @($Task.acceptance)
} | ConvertTo-Json -Depth 10 -Compress
node $Orchestrator dispatch --state $RunFile --command $Review
```

Danh sách `criteria` không tự đánh giá các tiêu chí; phải thực sự review trước.
Nếu không đạt, đổi verdict thành `changes_requested` và ghi evidence nêu rõ lý do.
Output thay đổi sau submit sẽ không được dùng review cũ; phải qua attempt mới.

### 8.3. Tích hợp code tuần tự

`accepted` chưa đưa code về checkout tích hợp. AI chính/người tích hợp cần:

1. Được giao quyền thực hiện thao tác Git tương ứng.
2. Kiểm tra checkout đích, branch, dirty files và diff đã accepted.
3. Đưa đúng thay đổi về checkout đích bằng quy trình Git của project.
4. Giải quyết conflict, kiểm tra ảnh hưởng; thay đổi nội dung đã review cần review lại.
5. Tạo commit nếu đã được phép và giữ worker tree nguyên trạng để xác minh receipt.
6. Ghi integration receipt bằng SHA đầy đủ của commit đã tồn tại.

Không cung cấp lệnh merge/cherry-pick chung cho mọi repo vì worker mặc định không
commit; phải chọn cách chuyển diff phù hợp với trạng thái thật. Không tự commit
trong worker tree để làm cho một lệnh merge có đầu vào.

```powershell
# Chỉ sau thao tác tích hợp/commit đã được cấp quyền và hoàn tất.
$IntegratedCommit = git -C $RepoRoot rev-parse HEAD
node $Orchestrator integrate --state $RunFile --task 'BE-01' --commit $IntegratedCommit --by 'main-integrator' --evidence '[Actual reviewed changes and integration evidence]'
```

`integrate` xác minh commit chứa các thay đổi được review; không tự merge/commit/push.
Lặp lại FE theo trình tự tích hợp thực tế. QA chỉ ready khi BE và FE đều integrated
và có baseline chứa đủ commit. Nếu chưa được phép commit, báo `accepted, pending
integration`; task phụ thuộc phải tiếp tục chờ.

## 9. Theo dõi tiến độ, pause và phục hồi

### Xem AI đang làm gì

```powershell
node $Orchestrator status --state $RunFile
node $Orchestrator status --state $RunFile --json
```

Đối chiếu dashboard với cập nhật của AI. Native agent và JSON run không tự đồng
bộ mọi sự kiện; AI chính phải ghi trạng thái và evidence phù hợp.

Bạn có thể dùng prompt:

```text
Báo cáo trạng thái run hiện tại theo task: worker/attempt/worktree, đầu vào,
kết quả đã có, checks, review, integration, blocker và task có thể giao tiếp.
Nếu có slot trống và task ready, tiếp tục trong phạm vi đã được phép.
```

### Pause/resume

```powershell
$Pause = @{ action = 'pause' } | ConvertTo-Json -Compress
node $Orchestrator dispatch --state $RunFile --command $Pause

$Resume = @{ action = 'resume' } | ConvertTo-Json -Compress
node $Orchestrator dispatch --state $RunFile --command $Resume
```

Pause chặn claim mới, không đóng băng agent đang chạy. Resume mở quyền nhận task,
không tự tạo process. Muốn agent dừng, yêu cầu AI chính dừng đúng agent rồi xác minh
kết quả; không suy luận từ pause/cancel state rằng worker đã bị ngắt.

### Retry sau failed hoặc changes_requested

```powershell
$Retry = @{ action = 'retry'; taskId = 'BE-01'; reason = '[Actual failure/review reason and recovery decision]' } | ConvertTo-Json -Compress
node $Orchestrator dispatch --state $RunFile --command $Retry
node $Orchestrator prepare --state $RunFile --task 'BE-01' --worker 'backend-worker-1' --worktree-root $WorktreeRoot
```

Lấy attempt mới từ output; không mặc định luôn là `BE-01-1`. Lưu code/evidence lần
cũ, kiểm tra trước khi chuyển phần hữu ích vào attempt mới. Late result của attempt
cũ không được submit cho attempt mới.

### Ghi hoạt động hoặc hủy task

Nếu AI thực sự quan sát agent vẫn hoạt động, có thể ghi heartbeat đúng attempt:

```powershell
$Heartbeat = @{ action = 'heartbeat'; taskId = 'BE-01'; attemptId = 'BE-01-1' } | ConvertTo-Json -Compress
node $Orchestrator dispatch --state $RunFile --command $Heartbeat
```

Không gửi heartbeat chỉ để làm dashboard trông như đang tiến triển. Heartbeat
không kèm phần trăm hoàn thành và không thay thế báo cáo kết quả cụ thể.

Khi đã quyết định hủy một task chưa accepted/integrated:

```powershell
$Cancel = @{ action = 'cancel'; taskId = 'BE-01'; reason = '[Actual cancellation decision]' } | ConvertTo-Json -Compress
node $Orchestrator dispatch --state $RunFile --command $Cancel
```

AI vẫn cần dừng agent thật riêng. Nếu task code đã integrated, không dùng cancel
để giả vờ đảo ngược code; cần một thay đổi/rollback có scope và quyền riêng.

### Mất phiên, task treo hoặc lock bận

Mở lại cùng repo và yêu cầu AI đọc đúng `$RunFile`, kiểm tra worker/worktree và
đối chiếu lần hoạt động cuối. Không init lại lên cùng state; không sửa JSON hoặc
xóa lock để ép chạy. Một heartbeat cũ không chứng minh task đã thất bại.

Nếu worker đã dừng và kết quả xác minh là thất bại, ghi `fail` đúng attempt rồi
retry rõ ràng. Nếu chưa biết process có còn tác động gì, giữ trạng thái chưa rõ
và kiểm tra trước. Hủy task dùng action `cancel`, taskId và reason; vẫn cần dừng
agent thật riêng nếu nó đang hoạt động.

Ví dụ ghi failure sau khi đã xác minh, chỉ áp dụng cho attempt còn running:

```powershell
$Failure = @{ action = 'fail'; taskId = 'BE-01'; attemptId = 'BE-01-1'; error = '[Verified failure and evidence]' } | ConvertTo-Json -Compress
node $Orchestrator dispatch --state $RunFile --command $Failure
```

Lịch sử event giữ tối đa 1.000 transition và số event đã bỏ; dashboard hiển thị
100 event gần nhất. Không coi nó là kho audit toàn bộ log hoặc mọi thao tác agent.

## 10. Kiểm chứng tính năng và bàn giao beta

### 10.1. Luồng skill nên dùng

| Giai đoạn | Skill/vai trò | Kết quả phải có |
|---|---|---|
| Nhận BA, khảo sát, lập plan | `ecc-work`; `ecc-plan` khi chỉ cần plan; explorer khi phù hợp | AC, code paths, contract, task graph, quyền hạn |
| Xem tiến độ | `ecc-view` | Snapshot task, worker, blocker, evidence và URL dashboard nếu có |
| Điều phối công việc độc lập | `team-agent-orchestration` | Packet, ownership, worktree, trạng thái và evidence |
| Viết code/test | `tdd-workflow`, kiến thức backend/frontend của stack | Thay đổi theo AC, test phù hợp; RED/GREEN chỉ khi chạy thật |
| Review | Reviewer được phiên hỗ trợ | Findings và quyết định theo đúng revision |
| Kiểm tra trước bàn giao | `verification-loop` | Build/type/lint/test/diff/security phù hợp, kết quả và phần chưa chạy |
| Chuẩn bị release | Quy trình Git/CI của project | Commit/branch/artifact rõ, deployment và rollback plan |
| Tester tiếp nhận | Checklist theo AC | Bản build, cách thử, kết quả mong đợi, hạn chế đã biết |

Bạn dùng `$` và chọn skill từ menu có thật. Vai trò reviewer là agent hoặc người
đánh giá, không mặc định có một skill cùng tên. Không cần gọi tất cả skill cho
một thay đổi nhỏ; không tự dùng bug workflow cho tính năng mới.

### 10.2. Kiểm tra trong giới hạn không DB

AI đối chiếu code/test với AC, chạy lint/type/unit/mock test khi đã được giao và
xác minh target không DB. Test dựa contract, không lấy row beta cũ làm expected.
App startup, integration/E2E test và CI có thể kết nối DB gián tiếp; chưa xác minh
an toàn thì không chạy và ghi rõ phần bị chặn.

Ví dụ yêu cầu kiểm chứng:

```text
Dùng verification-loop kiểm tra phần đã tích hợp theo AC và contract.
Trước khi chạy, kiểm tra target/side effect của command; chỉ chạy nhóm đã được
cấp quyền và bảo đảm không truy cập DB. Báo PASS/FAIL/NOT RUN kèm evidence,
revision, command, phạm vi và hạn chế. Không tự commit/push/deploy.
```

### 10.3. Commit, push và deploy beta là các hành động riêng

Trước release, AI cần đọc quy trình thật của repo: branch beta, CI config, job
deploy, biến môi trường theo tên không lộ secret, migration/seed hook, smoke check
và rollback. Không tự suy đoán lệnh `deploy:beta` hoặc branch tên `beta` là tồn tại.

Push có thể tự kích hoạt CI, deploy hoặc migration; do đó phải xét tác động trước
khi thực hiện. Trong run không DB này, chỉ chuẩn bị thay đổi và runbook nếu chưa
chứng minh được toàn bộ chuỗi thao tác không tác động DB.

Nếu đưa lên beta bắt buộc thao tác DB hoặc vận hành app có truy cập DB, giữ bước
đó ngoài phạm vi run hiện tại, báo rõ phần chờ người có quyền thực hiện. Không tự
chuyển `permissions.database` sang read/write. Việc nới phạm vi phải là quyết định
riêng của người dùng, không phát sinh từ câu “triển khai theo plan”.

### 10.4. Bản bàn giao tester

Chuẩn bị tài liệu theo mẫu sau, điền thông tin thật:

```text
Tính năng / ticket:
Tài liệu BA và API contract, phiên bản:
Branch / commit / build:
URL beta và trạng thái deploy: [chưa deploy / đã xác nhận bởi ai, lúc nào]
Phạm vi thay đổi:
Danh sách AC:
Các bước thao tác theo từng AC:
Kết quả mong đợi và căn cứ:
Các lỗi/edge case cần thử:
Kiểm chứng đã chạy: command, target, revision, kết quả, evidence:
Chưa kiểm chứng và lý do:
Yêu cầu dữ liệu/tài khoản thử: do người có quyền chuẩn bị, không dùng secret trong tài liệu:
Lưu ý tương thích, rủi ro và rollback:
Cách gửi bug: bước tái hiện, expected/actual, môi trường, build, payload đã loại secret:
```

Tester tự thao tác beta có thể tạo/cập nhật dữ liệu qua sản phẩm. Đây không phải
quyền ghi DB cho AI trong run này. Nếu tester báo lỗi, chọn bug-intake/diagnose/
plan/fix/review theo đúng yêu cầu và dừng ở ranh giới từng giai đoạn đã giao.

## 11. Dấu hiệu cần yêu cầu AI làm rõ

| Dấu hiệu | Phản hồi nên yêu cầu |
|---|---|
| AI nói đã tạo worker nhưng không có packet/worktree | Hỏi task/attempt, công cụ agent thật và vị trí checkout |
| Task dependent chạy khi upstream chưa integrated | Yêu cầu dừng giao mới và đối chiếu gate/baseline |
| Dashboard báo running nhưng agent chưa được giao | Yêu cầu đối chiếu claim với agent thật, không coi claim là tiến độ |
| Worker nói test pass nhưng không có command/evidence | Yêu cầu evidence hoặc giữ not-run |
| Đề nghị dùng row beta để quyết định luồng | Quay về BA và code; chỉ đọc ngữ cảnh khi thật cần và được phép |
| Tự dùng `run --execute` hoặc testHarness để chạy thật | Dừng đường chạy đó; chỉ dùng managed manual handoff được phép |
| Repo bị preflight từ chối | Báo giới hạn; không bỏ chốt để ép chạy |
| Tự push vì code accepted | Kiểm tra quyền publication và tác động CI trước |
| Task integrated nhưng chưa deploy | Giữ phân biệt commit tích hợp với môi trường đã triển khai |

## 12. Prompt ngắn cho những lần sử dụng tiếp theo

```text
$ecc-work Triển khai tính năng trong [BA/ticket] tại project này.
```

Hoặc dùng “Lập kế hoạch” thay “Triển khai” nếu chỉ muốn khảo sát/plan. Sau khi
đọc plan, “Tôi đồng ý, hãy triển khai” là đủ. Khi muốn xem tình hình, dùng
`$ecc-view` hoặc “Xem tiến độ”. Các ràng buộc cũ tiếp tục được áp dụng; chỉ cần
nêu phần muốn thay đổi so với quyền và ưu tiên đã thống nhất.

AI không tự chạy `run --execute`: chốt này vẫn khóa cho đến khi có adapter phù hợp.
