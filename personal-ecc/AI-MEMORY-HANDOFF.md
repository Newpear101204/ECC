# Handoff: Xây dựng bộ nhớ cá nhân độc lập cho AI

Cập nhật: 05/11/2026. Trạng thái: đã nghiên cứu, đang làm rõ yêu cầu, chưa chọn giải pháp, chưa triển khai.

## 1. Đọc trước khi tiếp tục

Đây là tài liệu bàn giao cuộc trao đổi và kết quả nghiên cứu để người dùng có thể tiếp tục cùng AI ở máy khác hoặc phiên mới. Đọc tài liệu này trước khi hỏi lại mục tiêu.

Người dùng muốn bàn và phát triển một bộ nhớ cho AI nói chung, không bó buộc vào ECC. File nằm trong thư mục cá nhân của fork ECC để thuận tiện mang theo bằng Git; vị trí này không phải quyết định rằng hệ thống bộ nhớ sẽ được xây bên trong ECC.

Cuộc trao đổi hiện đang làm rõ yêu cầu và phương pháp. Chưa có yêu cầu cài đặt sản phẩm, tải lịch sử lên dịch vụ ngoài hoặc xây dựng hệ thống. Những định hướng người dùng đã đồng ý được ghi rõ bên dưới; các phương án kỹ thuật còn lại là kết quả khảo sát và đề xuất của AI, chưa phải kiến trúc được chấp thuận.

## 2. Mong muốn thực sự của người dùng

Khi dùng AI làm một tính năng, sau một thời gian quay lại thì AI thường quên spec, quyết định và ngữ cảnh. Người dùng muốn một bộ nhớ lâu dài khắc phục điều này.

Các ý người dùng đã nêu:

- AI có thể nhớ công việc đã làm, các tính năng, dự án và vấn đề đã gặp.
- Khi bắt đầu làm việc hoặc nhắc lại một vấn đề, thông tin liên quan tự xuất hiện, không phải mỗi lần người dùng lại chỉ tài liệu và yêu cầu đọc.
- Không muốn trải nghiệm phải mò qua một đống tài liệu hay đọc lịch sử tuần tự từ hiện tại ngược về quá khứ.
- Ví von với việc con người gợi lại một sự kiện từ thời nhỏ: mong muốn nhớ theo liên tưởng, chứ không phải yêu cầu mô phỏng chính xác sinh học của não.
- Muốn tách “bộ não” khỏi từng AI. Khi đổi AI hoặc máy tính, có thể kết nối/nạp bộ nhớ một lần rồi tiếp tục sử dụng những hiểu biết trước đây.
- Bộ nhớ phục vụ nhiều dự án và có thể nhiều công cụ AI, không chỉ một repo hoặc ECC.
- Người dùng từng nghe đến vector và muốn khảo sát cả các phương pháp đã có, không giới hạn lựa chọn vào vector.

Ngôn ngữ trao đổi: tiếng Việt. Người dùng yêu cầu riêng file handoff này viết tiếng Việt để có thể tự đọc.

### Làm rõ mục tiêu: tích lũy kinh nghiệm và một trí nhớ chung

Người dùng giải thích rằng mục đích của “bộ não giống con người” là **kinh nghiệm**: khi AI đã gặp và xử lý một vấn đề khó ở tính năng hoặc dự án A, sang tính năng hoặc dự án B có vấn đề tương tự thì có thể nhận ra và biết hướng xử lý ngay. Mục tiêu không dừng ở nhớ spec hay tìm lại đoạn trao đổi; cần vận dụng điều đã học vào tình huống mới, kể cả khi tên hàm, ngôn ngữ hoặc nghiệp vụ khác nhau.

Ý tưởng tổ chức do người dùng nêu:

> Mỗi cuộc trò chuyện hiện có một trí nhớ riêng. Có thể đưa các cuộc trò chuyện vào một trí nhớ, hoặc hợp nhất các trí nhớ đó thành một trí nhớ chung, tùy cách nào khả thi hơn.

**Không hiểu cứng nhắc câu trên thành yêu cầu đưa toàn bộ hội thoại vào bộ nhớ hoặc vào prompt.** Đây là ý tưởng về việc thống nhất trí nhớ giữa các cuộc trò chuyện; cách biểu diễn, lưu và đưa thông tin cho model vẫn là bài toán kỹ thuật chưa chốt.

```text
Cuộc trò chuyện A ─┐
Cuộc trò chuyện B ─┼──↔ Trí nhớ chung ↔── Các cuộc trò chuyện mới
Cuộc trò chuyện C ─┘
```

Định hướng cần giữ: nhiều cuộc trò chuyện cùng sử dụng và đóng góp vào một trí nhớ chung. Ngữ cảnh làm việc của mỗi cuộc vẫn có thể riêng, nhưng kinh nghiệm không bị giới hạn trong cuộc đó. “Một trí nhớ” không bắt buộc là một file, một bảng hoặc một model duy nhất; không suy diễn thành quyết định triển khai vật lý.

AI đã đề xuất cho các cuộc trò chuyện cùng đọc/cập nhật hệ thống nhớ ngay từ đầu; hợp nhất các trí nhớ riêng có thể phục vụ nhập lịch sử cũ. Đây là đề xuất, chưa phải lựa chọn kỹ thuật được người dùng chấp thuận. Ngữ cảnh của một cuộc trò chuyện cũng không mặc nhiên là trạng thái nội bộ có thể xuất ra rồi ghép nguyên trạng giữa các model.

Để phục vụ kinh nghiệm, AI đề xuất giữ cả trải nghiệm cụ thể và bài học có thể khái quát:

- Dấu hiệu vấn đề và bối cảnh xuất hiện.
- Nguyên nhân đã xác định, phân biệt với giả thuyết.
- Cách đã thử, kết quả thành công/thất bại và nguồn xác nhận.
- Giải pháp, lý do hiệu quả, điều kiện áp dụng và ngoại lệ.
- Liên kết với các trải nghiệm khác, kể cả ở dự án khác.

Luồng gợi ý: gặp vấn đề → xử lý → xác nhận kết quả → rút bài học → nhận ra tình huống tương tự → vận dụng và cập nhật kinh nghiệm. Không lưu giải pháp chưa được kiểm chứng như một kinh nghiệm đã thành công. Đây là hành vi mong muốn và đề xuất tổ chức, không phải cơ chế đã triển khai.

Một trí nhớ chung vẫn cần giữ nguồn gốc và phạm vi: quy định riêng của dự án A không tự thành quy tắc cho B; bài học khái quát có thể dùng xuyên dự án nếu điều kiện phù hợp. Nhận ra mẫu quen thuộc giúp đưa ra hướng kiểm tra tốt sớm hơn, không thay thế kiểm tra bối cảnh mới hoặc bảo đảm dùng lại giải pháp luôn đúng.

Ví dụ minh họa do AI đưa ra, không phải sự kiện thực tế của người dùng: xử lý giao dịch trùng ở dự án A có thể giúp nhận ra nguy cơ tạo đơn hàng trùng ở dự án B. Bài học là xem xét xử lý yêu cầu lặp ở phía thực thi; không chỉ nhớ tên hàm từng sửa.

Tiêu chí đánh giá cần bổ sung: sau trải nghiệm ở A, trong phiên mới ở B, hệ thống có tự nhận ra cấu trúc vấn đề tương tự, gợi đúng bài học và điều kiện áp dụng, đồng thời tránh áp dụng sai khi bối cảnh khác không? Đây là kiểm tra chuyển giao kinh nghiệm, vượt ra ngoài hỏi lại thông tin cũ.

### Định hướng đã đồng ý: một trí nhớ chung có phân biệt phạm vi

Người dùng lo AI có thể bị nhầm khi biết và nhớ quá nhiều, sau đó bày tỏ thích cách bộ nhớ phân biệt các phạm vi và yêu cầu lưu lại. **Phân biệt phạm vi trong trí nhớ chung là định hướng người dùng đã đồng ý.** Chưa chọn schema, sản phẩm hay cơ chế phân vùng cụ thể.

| Loại thông tin | Phạm vi và cách dùng mong muốn |
| --- | --- |
| Sở thích, nguyên tắc cá nhân | Dùng chung khi phù hợp; không ghi đè yêu cầu cụ thể hiện tại |
| Quyết định và trạng thái dự án | Gắn đúng dự án, tính năng, phiên bản và thời điểm; không mang sang dự án khác như mặc định |
| Kinh nghiệm xử lý vấn đề | Có thể dùng xuyên dự án, nhưng giữ điều kiện áp dụng, ngoại lệ và bằng chứng |
| Giả thuyết, giải pháp đang thử | Ghi rõ chưa xác nhận; không biến thành nguyên nhân hoặc cách sửa đã được chứng minh |
| Thông tin bị thay thế | Giữ làm lịch sử nếu cần; không dùng như trạng thái hiện tại |

Một trí nhớ thống nhất không có nghĩa cung cấp mọi ký ức cho mọi cuộc trò chuyện. Khi làm dự án B, ưu tiên bối cảnh của B cùng các kinh nghiệm liên quan từ nơi khác, giữ rõ nguồn gốc và phạm vi. Cách lưu vật lý và cơ chế lựa chọn ngữ cảnh vẫn cần thiết kế.

Những nguy cơ cần kiểm soát: lấy sai ký ức, trộn bối cảnh giữa dự án, dùng quyết định hết hiệu lực, hoặc áp dụng máy móc giải pháp cũ. Không quy toàn bộ nguy cơ về dung lượng kho nhớ; cũng không hứa phân vùng tự loại bỏ mọi nhầm lẫn.

Nguyên tắc vận dụng kinh nghiệm đã trao đổi: ký ức giúp AI nhận ra hướng cần kiểm tra, không mặc định cung cấp đáp án đúng cho tình huống mới. Ví dụ “lần trước lỗi tương tự do cache, cần kiểm tra khả năng này” không được biến thành “lỗi này chắc chắn do cache”. Khi ký ức mâu thuẫn hoặc không rõ phạm vi, kiểm tra nguồn, thời điểm và bối cảnh; hỏi người dùng nếu vẫn thiếu căn cứ quan trọng.

Đánh giá cần có cả tình huống tương tự thật sự và tình huống nhìn giống nhưng khác nguyên nhân hoặc điều kiện, để phát hiện việc chuyển giao kinh nghiệm sai.

### Ưu tiên mới ngày 05/11/2026

Người dùng đã xác định ba ưu tiên:

1. Chính xác, có cấu trúc lưu trữ giúp truy xuất ký ức dễ dàng.
2. Lưu bộ nhớ trên nền tảng bên thứ ba, thay vì lấy file/folder trên máy cá nhân làm nơi lưu chính, để linh hoạt giữa các máy.
3. Mong muốn gắn bộ não vào là có trí nhớ ngay và sử dụng giống cache, tránh đọc lại toàn bộ hội thoại hoặc tăng token mỗi khi nhớ lại, đặc biệt khi kho nhớ ngày càng lớn.

Điểm 3 là trải nghiệm và mục tiêu chi phí người dùng mong muốn, chưa phải khẳng định kỹ thuật có thể bảo đảm. Chưa chọn nền tảng, model hay ứng dụng tích hợp. Không suy diễn ưu tiên cloud thành quyền upload dữ liệu.

Phân biệt kỹ thuật đã đối chiếu:

- **Bộ nhớ bền:** giữ sự kiện, dữ kiện, quan hệ, nguồn và lịch sử trên dịch vụ ngoài.
- **Cache truy xuất của ứng dụng/database:** tái sử dụng kết quả tìm kiếm hoặc gói ngữ cảnh; không tự làm cho mô hình biết nội dung mà nó chưa được cung cấp.
- **Prompt/KV cache của hệ thống chạy model:** tái sử dụng xử lý ngữ cảnh tương thích. Có thể giảm thời gian và chi phí input lặp lại; không đồng nghĩa không dùng token, không có giới hạn context hoặc lưu vĩnh viễn. Không giả định mang cache nguyên trạng sang model khác.
- Lịch sử hội thoại được lưu bền, nội dung đang có trong context, và KV cache là ba trạng thái khác nhau. Cache hết hạn không bắt buộc đọc lại toàn bộ lịch sử nếu có lớp bộ nhớ bền cung cấp gói ngữ cảnh phù hợp.

Đề xuất đang bàn, chưa được duyệt: bộ nhớ có cấu trúc trên cloud + gói ngữ cảnh nhỏ cho dự án/tác vụ đang làm + cache cho phần ổn định + truy xuất bổ sung khi cần. Ngân sách ngữ cảnh cần có giới hạn và khả năng mở rộng khi thiếu chứng cứ; không hứa một bản tóm tắt cố định có thể trả đúng mọi câu hỏi. Cập nhật dữ kiện phải làm mất hiệu lực cache liên quan để tránh nhớ thông tin cũ.

Mục tiêu thực tế để đo: kho nhớ tăng nhưng không gửi toàn bộ kho vào mỗi lượt; theo dõi token mới, token cache, chi phí ghi/tổng hợp/truy xuất và độ chính xác riêng. Truy vấn database không mặc nhiên là một lượt gọi LLM, nhưng embedding, reranking, tổng hợp và nội dung trả cho model vẫn có thể phát sinh chi phí.

Nguồn bổ sung về caching:

- [Claude prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching): tái sử dụng prefix, có điều kiện khớp, thời hạn và phí đọc/ghi cache.
- [Gemini context caching](https://ai.google.dev/gemini-api/docs/caching): hỗ trợ tối ưu input lặp lại; cần kiểm tra API/model cụ thể.
- [vLLM automatic prefix caching](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/): tái sử dụng KV của prefix đã xử lý; không thay thế kho kiến thức bền.

## 3. Kết luận nghiên cứu cần giữ lại

Hướng gần yêu cầu nhất hiện nay là **bộ nhớ ngoài độc lập + cơ chế tự ghi nhận + cơ chế tự gợi nhớ và đưa ngữ cảnh vào AI**.

Cần phân biệt hai lời hứa:

1. Kết nối mỗi ứng dụng AI mới với cùng một dịch vụ bộ nhớ một lần; sau đó hệ thống tự đọc/ghi khi sử dụng: khả thi khi ứng dụng cho phép tích hợp.
2. Nạp toàn bộ ký ức vào bất kỳ mô hình nào một lần và mô hình vĩnh viễn nhớ chính xác mọi thứ trong mọi phiên: chưa có giải pháp phổ quát được chứng minh trong các nguồn đã khảo sát.

“Không bắt người dùng tìm tài liệu” không có nghĩa bên trong hệ thống không được truy xuất. Hệ thống có thể tự truy xuất theo ý nghĩa, từ khóa, quan hệ và thời gian rồi cung cấp đúng ngữ cảnh. Đây có thể là trải nghiệm phù hợp với người dùng, nhưng cần giải thích rõ và không đánh tráo nó thành khả năng nhớ vô hạn.

Vector giúp tìm theo ý nghĩa nhưng không tự giải quyết toàn bộ việc ghi nhớ, cập nhật sự thật, lịch sử quyết định, phân biệt dự án và chuyển dữ liệu giữa nhà cung cấp.

## 4. Các hướng đã khảo sát

| Hướng | Ý nghĩa | Mức phù hợp và giới hạn |
| --- | --- | --- |
| Context dài / đưa lại lịch sử | Cho mô hình đọc nhiều nội dung trước đây | Hỗ trợ xử lý nhưng chưa tự tạo bộ nhớ bền xuyên phiên, xuyên công cụ |
| Bộ nhớ cốt lõi luôn có mặt | Luôn đưa hồ sơ và thông tin thiết yếu vào context | Giúp AI có nền ngay; cần giới hạn dung lượng |
| Vector và truy xuất kết hợp | Tìm theo ý nghĩa cùng từ khóa, mã lỗi, tên chính xác | Phù hợp gợi nhớ liên tưởng; cần thêm quản lý vòng đời ký ức |
| Bộ nhớ sự kiện và đồ thị thời gian | Lưu sự kiện, quan hệ, nguồn và thời gian hiệu lực | Phù hợp dự án, spec và quyết định thay đổi theo thời gian |
| Agent tự quản lý bộ nhớ | Tự ghi, liên kết, tổng hợp, cập nhật và gọi lại | Gần nhất với trải nghiệm người dùng mong muốn |
| Bộ nhớ neural / học vào trọng số | Thay đổi mô hình, adapter hoặc trạng thái bên trong | Có nghiên cứu đáng chú ý nhưng phụ thuộc kiến trúc, khó mang sang AI bất kỳ |
| Xử lý đệ quy kho ngữ cảnh lớn | AI dùng công cụ/code để khảo sát lịch sử lớn khi cần | Bổ trợ điều tra sâu; không tự cung cấp thu thập và lưu nhớ suốt đời |

Các nhóm có thể phối hợp, không bắt buộc chọn duy nhất một nhóm.

## 5. Những hệ thống đáng đánh giá

Các nhận xét sau dựa trên tài liệu và repository của bên phát triển tại thời điểm nghiên cứu. Chưa cài đặt hoặc chạy thử độc lập; cần kiểm tra lại phiên bản trước khi chọn.

| Hệ thống | Lý do đáng quan tâm | Điều cần kiểm tra |
| --- | --- | --- |
| Cognee | Kết hợp graph và vector. Tích hợp Codex hiện mô tả tự cung cấp ngữ cảnh mỗi prompt và thu thập kiến thức phiên; có chia sẻ với Claude Code | Phân vùng dataset, yêu cầu model/key, xử lý thông tin mâu thuẫn và lịch sử |
| Graphiti / Zep | Graphiti lưu sự kiện và quan hệ có thời gian, nguồn gốc, hỗ trợ dữ kiện bị thay thế; có thể tự triển khai | Graphiti là hạ tầng, cần lớp tự ghi và tự đưa ký ức vào client; không đồng nhất mọi tính năng Zep với mã nguồn Graphiti |
| Letta / MemGPT | Runtime agent có trạng thái và bộ nhớ bền; có bộ nhớ cốt lõi và cơ chế tổng hợp nền | Chấp nhận mức phụ thuộc runtime nào; phần nào thực sự được xuất và chuyển đi |
| Mem0 / OpenMemory | Lớp bộ nhớ tái sử dụng, có SDK và tích hợp công cụ | MCP có thể chỉ cung cấp tool. Tài liệu Codex hiện mô tả tự recall ở prompt đầu phiên đủ điều kiện, không bảo đảm mọi lượt. Plugin đóng gói và SDK tự host có thể khác yêu cầu |
| Supermemory | Plugin Codex có nạp hồ sơ, recall theo prompt và ghi nhớ nền | Server self-host không có toàn bộ mã nguồn công khai; bản local lite có giới hạn 10.000 documents; chuyển endpoint không tự di chuyển dữ liệu |
| MemOS | Mô hình “hệ điều hành bộ nhớ”, tổ chức nhiều loại nhớ trong MemCube | Container chuyển được không đồng nghĩa KV cache hoặc trọng số dùng được trên mọi model |

Gợi ý của AI, chưa phải lựa chọn của người dùng:

- Muốn thử trải nghiệm tự động sớm trong công cụ coding: cân nhắc Cognee và Supermemory.
- Muốn tự kiểm soát dữ liệu và lịch sử quyết định: cân nhắc Graphiti cùng lớp tích hợp tự đọc/ghi.
- Muốn dùng cả runtime agent được thiết kế quanh bộ nhớ: xem Letta.
- Mem0 và MemOS cũng đáng thử nếu đường tích hợp và cách triển khai phù hợp.

Không chọn sản phẩm chỉ từ tỷ lệ benchmark do các hãng công bố. Khác model, dữ liệu, cách truy xuất và ngân sách token thì điểm số không so sánh trực tiếp được.

## 6. Kiến trúc gợi ý để bàn tiếp

Đây là tổng hợp kỹ thuật từ các nguồn, chưa phải thiết kế đã được kiểm nghiệm trọn gói.

```text
Codex / Claude / công cụ AI khác
              ↕
Lớp tự gợi nhớ và tự ghi nhận
              ↕
Bộ nhớ độc lập do người dùng kiểm soát
              │
     Hồ sơ cá nhân
     Dự án và tính năng
     Quyết định và lý do
     Sự kiện, vấn đề, kết quả
     Nguồn gốc và lịch sử thay đổi
```

Luồng mong muốn:

1. Trước mỗi lượt: nhận diện người dùng/dự án, cung cấp hồ sơ cốt lõi và tự lấy ký ức liên quan.
2. Trong tác vụ: lấy thêm thông tin khi cần suy luận sâu.
3. Sau công việc: ghi nhận những gì thực sự đã xảy ra, quyết định được chấp nhận, kết quả và việc còn mở.
4. Ở nền: hợp nhất thông tin trùng, liên kết ký ức, cập nhật dữ kiện hết hiệu lực và tổng hợp bài học.

Với tính năng phần mềm, bộ nhớ nên phân biệt:

- Ý định/spec và tiêu chí nghiệm thu.
- Đề xuất của AI với quyết định người dùng đã chấp nhận.
- Kế hoạch với thay đổi code đã thực hiện.
- Đã sửa với đã chạy kiểm tra, được người dùng xác nhận hoặc đã triển khai.
- Trạng thái hiện tại với lịch sử cũ và nguyên nhân thay đổi.

Ví dụ: “AI đã sửa code, người dùng chưa chạy thử” không được tóm tắt thành “bug đã được xác nhận hết”.

Mỗi ký ức nên có danh tính ổn định, phạm vi dự án, nguồn chứng cứ, thời điểm ghi nhận, thời gian hiệu lực và trạng thái xác nhận. Branch/version quan trọng khi chúng làm thay đổi ý nghĩa. Code và Git hiện tại vẫn cần được kiểm tra khi khẳng định trạng thái repo; ký ức không tự thay thế bằng chứng hiện tại.

## 7. Tính di chuyển và quyền sở hữu

Ba việc khác nhau cần được kiểm tra riêng:

- Đổi model nhưng giữ dịch vụ nhớ: cần adapter tương thích.
- Đổi ứng dụng AI: cần ứng dụng cho phép tự đưa ngữ cảnh vào và thu thập kết quả, hoặc runtime làm thay việc đó.
- Đổi nhà cung cấp bộ nhớ: cần xuất đầy đủ, ánh xạ dữ liệu và kiểm tra khôi phục; có MCP không tự bảo đảm điều này.

Nên giữ dữ liệu nguồn cùng với facts, sự kiện, quan hệ, tóm tắt, thời gian, phạm vi và dấu xóa. Embedding là chỉ mục có thể tạo lại; cần biết model/version đã dùng. Không chỉ xuất vector rồi coi đó là toàn bộ trí nhớ. Credentials phải nằm ngoài dữ liệu ký ức được xuất.

MCP là giao thức cung cấp công cụ, không phải chuẩn đầy đủ cho bộ não. Kết nối MCP không có nghĩa client chắc chắn tự recall trước mọi câu trả lời.

Agent File của Letta chuyển được nhiều trạng thái agent, nhưng README tại thời điểm khảo sát ghi chưa hỗ trợ archival-memory Passages. Chưa thể coi đây là định dạng chuyển toàn bộ ký ức sang mọi AI.

Có thể nhập lịch sử trò chuyện và repo cũ để khởi tạo. Thông tin chưa từng được giữ lại không thể được phục dựng đáng tin cậy; cần đánh dấu thiếu thay vì bịa lý do hoặc sự kiện.

## 8. Cách kiểm chứng phù hợp với người dùng

Đề xuất thử khoảng 50–100 câu hỏi từ lịch sử dự án thật, không chỉ demo câu hỏi đơn giản. Chưa tạo bộ dữ liệu này.

| Tình huống | Kết quả mong đợi |
| --- | --- |
| Phiên trắng, AI/model khác | Tự dùng đúng ký ức mà không cần nhắc “hãy tìm lại” |
| Vấn đề tương tự ở dự án mới | Tự gợi kinh nghiệm từ dự án cũ dù cách gọi khác; kiểm tra điều kiện áp dụng, không sao chép giải pháp máy móc |
| Vấn đề nhìn giống nhưng khác nguyên nhân | Không kết luận từ kinh nghiệm cũ; kiểm tra chứng cứ hiện tại và loại bỏ cách xử lý không phù hợp |
| Hai dự án có module cùng tên | Không trộn quyết định; hỏi rõ nếu không nhận diện được dự án |
| Spec đã đổi nhiều lần | Biết hiện tại đúng gì và trả đúng lịch sử khi hỏi mốc cũ |
| Đề xuất chưa được chấp thuận | Không ghi thành quyết định của người dùng |
| Viết code nhưng chưa chạy | Không tự khẳng định đã test thành công |
| Mã lỗi hoặc tham số hiếm | Nhớ đúng chi tiết và truy được nguồn |
| Chưa từng được cung cấp thông tin | Thừa nhận thiếu bằng chứng |
| Xuất và khôi phục bộ nhớ | Giữ được nguồn, thời gian, quan hệ và hành vi trên cùng bộ câu hỏi |
| Xóa ký ức | Không xuất hiện lại qua summary, graph, embedding hoặc replay ngoài ý muốn; backup có chính sách rõ |
| Nội dung ngoài không đáng tin | Không biến lời trong web/README/tool output thành chỉ dẫn hay quyền hạn của người dùng |

Đo riêng việc hệ thống có tự recall hay không và câu trả lời có đúng không. Đồng thời đo độ trễ, chi phí, nguồn chứng cứ và lỗi lẫn dự án. Benchmark về “quên” không tự chứng minh dữ liệu đã bị xóa vật lý khỏi mọi log/backup.

## 9. Nguồn tham khảo đã thu thập

### Nền tảng nghiên cứu bộ nhớ ngoài

- [MemGPT](https://arxiv.org/abs/2310.08560): bộ nhớ phân tầng và điều phối dữ liệu vào/ra context.
- [Generative Agents](https://arxiv.org/abs/2304.03442): chuỗi trải nghiệm, relevance/recency/importance và reflection.
- [MemoryBank](https://arxiv.org/abs/2305.10250): cập nhật liên tục, cá nhân hóa, củng cố và quên có chọn lọc.
- [A-MEM](https://arxiv.org/abs/2502.12110), [repository](https://github.com/agiresearch/A-mem): ký ức dạng note tự liên kết và phát triển.
- [Recursive Language Models](https://arxiv.org/abs/2512.24601), [repository](https://github.com/alexzhang13/rlm): xử lý kho ngữ cảnh lớn bằng điều phối đệ quy; cần hệ thống lưu lịch sử riêng.

### Hướng gắn sâu vào mô hình

- [LongMem](https://arxiv.org/abs/2306.07174): bộ nhớ với mạng phụ đã huấn luyện.
- [MEMORYLLM](https://arxiv.org/abs/2402.04624): bộ nhớ latent tự cập nhật.
- [Larimar](https://arxiv.org/abs/2403.11901): associative episodic memory và chỉnh sửa kiến thức.
- [Titans](https://arxiv.org/abs/2501.00663): neural memory học tại thời điểm sử dụng.
- [SEAL](https://arxiv.org/abs/2506.10943): tự tạo dữ liệu thích nghi và cập nhật trọng số; có vấn đề forgetting khi cập nhật nối tiếp.
- [Nested Learning / HOPE](https://arxiv.org/abs/2512.24695), [giải thích của nhóm nghiên cứu](https://research.google/blog/introducing-nested-learning-a-new-ml-paradigm-for-continual-learning/): học ở nhiều thang thời gian; hướng nghiên cứu, chưa phải bộ não cá nhân dùng chung cho mọi API.

### Triển khai và tích hợp

- [Cognee core](https://github.com/topoteretes/cognee), [Codex integration](https://github.com/topoteretes/cognee-integrations/tree/main/integrations/codex).
- [Graphiti](https://github.com/getzep/graphiti), [MCP server](https://github.com/getzep/graphiti/tree/main/mcp_server).
- [Letta memory blocks — legacy SDK](https://docs.letta.com/v1-sdk/memory/memory-blocks), [memory & dreaming hiện tại](https://docs.letta.com/configuration/memory). Không mặc định hai thế hệ giao diện có cùng hợp đồng lưu trữ.
- [Mem0](https://github.com/mem0ai/mem0), [MCP](https://docs.mem0.ai/platform/mem0-mcp), [Codex integration](https://docs.mem0.ai/integrations/codex).
- [Supermemory Codex plugin](https://github.com/supermemoryai/codex-supermemory), [giới hạn self-host](https://supermemory.ai/docs/self-hosting/local-vs-enterprise), [quickstart](https://supermemory.ai/docs/self-hosting/quickstart).
- [MemOS](https://github.com/MemTensor/MemOS), [core concepts](https://github.com/MemTensor/MemOS/blob/main/docs/en/open_source/home/core_concepts.md).
- [Qdrant hybrid search](https://qdrant.tech/documentation/search/text-search/hybrid-search/): kết hợp tín hiệu ngữ nghĩa và từ khóa.

### Di chuyển, đánh giá và an toàn bộ nhớ

- [MCP tools specification](https://modelcontextprotocol.io/specification/latest/server/tools).
- [Letta Agent File](https://github.com/letta-ai/agent-file).
- [LongMemEval](https://github.com/xiaowu0162/longmemeval): nhớ xuyên phiên, cập nhật kiến thức, thời gian và abstention; chú ý phiên bản dữ liệu/cấu hình.
- [LoCoMo](https://github.com/snap-research/locomo): hội thoại dài; không tự chứng minh hiệu quả trên dự án coding thật.
- [BEAM](https://github.com/mohammadtavakoli78/BEAM): kiểm tra nhiều năng lực nhớ với lịch sử lớn.
- [LongMemEval-V2](https://github.com/xiaowu0162/LongMemEval-V2): hiểu tác vụ và môi trường qua lịch sử.
- [MemoryAgentBench](https://arxiv.org/abs/2507.05257): có selective forgetting.
- [MemSecBench](https://arxiv.org/abs/2607.27080): đánh giá an toàn qua vòng đời ghi, thực thi và quên.
- [Zep research](https://www.getzep.com/research/), [Mem0 research](https://mem0.ai/research): đọc cùng cấu hình thử nghiệm; không dùng tỷ lệ khác cấu hình để xếp hạng trực tiếp.

## 10. Trạng thái và điểm tiếp tục

Đã hoàn thành:

- Làm rõ mục tiêu độc lập với ECC và từng AI.
- Làm rõ mục tiêu tích lũy/vận dụng kinh nghiệm xuyên dự án và ý tưởng nhiều cuộc trò chuyện cùng đóng góp vào một trí nhớ chung; chưa chốt cách triển khai.
- Ghi nhận định hướng người dùng đã đồng ý: trí nhớ chung phân biệt phạm vi cá nhân, dự án, kinh nghiệm, thông tin chưa xác nhận và lịch sử bị thay thế.
- Khảo sát phương pháp, paper, hệ thống, tích hợp tự động, tính di chuyển và đánh giá.
- Đề xuất kiến trúc và bộ tiêu chí thử nghiệm ở mức ý tưởng.
- Lưu bối cảnh và nguồn trong handoff này.

Chưa thực hiện:

- Chọn sản phẩm hoặc kiến trúc cuối cùng.
- Cài đặt dịch vụ, plugin, database hoặc MCP cho bộ nhớ.
- Thu thập/upload hội thoại hay dữ liệu dự án của người dùng.
- Benchmark thực tế hoặc chứng minh chất lượng của ứng viên.
- Chọn nhà cung cấp lưu trữ cloud cụ thể, ngân sách, model, hạ tầng, chính sách riêng tư và backup.

Những câu hỏi tiếp theo nên giải quyết khi người dùng muốn phát triển:

1. Công cụ AI nào cần hỗ trợ trước? Cần những máy/hệ điều hành nào?
2. Nền tảng bên thứ ba nào phù hợp để lưu bộ nhớ? Ưu tiên dịch vụ quản lý sẵn hay hạ tầng cloud tự quản lý? Người dùng đã ưu tiên lưu ngoài máy cá nhân.
3. Ưu tiên dữ liệu/mã nguồn tự kiểm soát, trải nghiệm có sẵn, chi phí hay tốc độ triển khai?
4. Có lịch sử cũ nào để nhập? Phạm vi nào được phép thu thập và phạm vi nào cần loại trừ?
5. Chọn thử ứng viên hiện có hay xây lớp điều phối riêng trên một backend?

Đề xuất bước tiếp theo: xác định các ràng buộc trên, chọn ít ứng viên để thử với cùng một tập tình huống dự án thật, rồi mới quyết định triển khai. Không bắt người dùng trình bày lại mục tiêu đã ghi ở đây và không coi đề xuất nghiên cứu là quyết định đã được duyệt.

## 11. Tiếp tục ở máy khác

File này dùng đường dẫn tương đối và không cần cài ECC để đọc. Để file có mặt khi pull ở máy khác, thay đổi cần được commit và push vào fork; việc tạo file không tự đồng bộ Git.

Có thể đưa câu sau cho AI trong phiên mới:

> Hãy đọc `personal-ecc/AI-MEMORY-HANDOFF.md` để nắm yêu cầu và kết quả nghiên cứu về bộ nhớ AI của tôi. Tiếp tục từ trạng thái bàn giao, phân biệt đề xuất với quyết định đã chấp thuận. Trao đổi với tôi bằng tiếng Việt.

Lưu ý: handoff này lưu lại cuộc nghiên cứu; nó chưa phải hệ thống bộ nhớ tự động đang hoạt động.
