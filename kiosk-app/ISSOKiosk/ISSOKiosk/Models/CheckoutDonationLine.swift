import Foundation

/// One row on the review screen and receipt (primary donation + additional seva lines).
struct CheckoutDonationLine: Identifiable, Equatable {
    var id: UUID
    var label: String
    var amount: Double
    var categoryId: String?
    /// Unit count when category uses quantity on kiosk (default 1).
    var quantity: Int
    
    static func primary(amount: Double, category: DonationCategory?, quantity: Int = 1) -> CheckoutDonationLine {
        let q = max(1, quantity)
        if let c = category {
            return CheckoutDonationLine(id: UUID(), label: c.name, amount: amount, categoryId: c.id, quantity: q)
        }
        return CheckoutDonationLine(
            id: UUID(),
            label: "generalDonationLineLabel".localized,
            amount: amount,
            categoryId: nil,
            quantity: 1
        )
    }
}
