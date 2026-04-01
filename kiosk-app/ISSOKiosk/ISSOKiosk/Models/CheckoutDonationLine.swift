import Foundation

/// One row on the review screen and receipt (primary donation + additional seva lines).
struct CheckoutDonationLine: Identifiable, Equatable {
    var id: UUID
    var label: String
    var amount: Double
    var categoryId: String?
    
    static func primary(amount: Double, category: DonationCategory?) -> CheckoutDonationLine {
        if let c = category {
            return CheckoutDonationLine(id: UUID(), label: c.name, amount: amount, categoryId: c.id)
        }
        return CheckoutDonationLine(
            id: UUID(),
            label: "generalDonationLineLabel".localized,
            amount: amount,
            categoryId: nil
        )
    }
}
